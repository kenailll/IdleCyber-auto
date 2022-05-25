// import { readFile } from 'fs/promises';
import { promises as fs } from 'fs'
import Queue from 'bull';
import { IdleCyber, bestOpponentx, teamCastoff, saveToken } from './idlecyber.js'
import { Browser, sleep } from './launcher720.js'
import { scheduleJob } from 'node-schedule';

async function doJobs(whiteLists, queue) {
	for(let account_info of whiteLists){
		try{
			let order = {
				email: account_info.email,
				password: account_info.password
			};
			console.log(order);
			await queue.add(order, { 
				removeOnComplete: true,
				attempts: 5,
        		backoff: 10000
			});
		} catch (error){

		}
	}
}

(async () => {
	var thread = 2;
	var browsers = [];

    const workerQueue = new Queue('ProcessKey');
	await workerQueue.obliterate({ force: true });

	for(let i=0; i<thread; i++){
		browsers[i] = new Browser();
		await browsers[i].launch();
	}
	
	const whiteLists = JSON.parse(await fs.readFile('./whiteList.json')); 

	//Job start
	workerQueue.process(thread, async (job, done) => {
		try {
			let data = job.data;
			let email = data.email;
			let password = data.password;
			let accountIndex = whiteLists.findIndex((obj => obj.email == email));
			
			var browser;
			for(let i=0; i<=thread; i++){
				if(i == thread){
					throw 'Browser Error';
				}
				if(!browsers[i].running){
					browsers[i].running = true;
					browser = browsers[i];
					await browser.init(email, password);
					break;
				}				
			}
			
			while(true){
				let waitJob = browser.waitingJob;
				var account = null;
				
				//try create IdleCyber 3 times (attempt)
				account = new IdleCyber(email, browser.account);
	
				if (waitJob === null){
					await account.getQuests();
					try{
						//log reports
						let reports = JSON.parse(await fs.readFile('./reports.json')); 
						let date = new Date().toLocaleDateString();
	
						if(reports[email] == undefined){
							reports[email] = {};
						}
	
						if(reports[email][date] == undefined){
							reports[email][date] = browser.reports;
						} else {
							reports[email][date].mIDLE += browser.reports.mIDLE;
							reports[email][date].exp += browser.reports.exp;
						}
						await fs.writeFile('./reports.json', JSON.stringify(reports, '', 4))
	
						await browser.signOut();
						console.log(`${email} --- exit`)
					}catch{}
					break;
				}
				
				if(waitJob == undefined || waitJob == 0){
					let state = await account.getState();
					if(state == undefined){
						await sleep(1000)
						continue
					}
	
					// mission
					let mission;
					const missionLeft = state.currentState.mission.remainTurn;
					const pvpLeft = state.currentState.pvp.remainTurn;
	
					// console.log(email, missionLeft, pvpLeft);
					if(whiteLists[accountIndex].mission == ''){
						mission = state.currentState.mission.currentMission
					} else {
						mission = whiteLists[accountIndex].mission
					}
							
					if(missionLeft > 0){
						browser.waitingJob = missionLeft;
						browser.campain(mission, email, browser.waitingJob);
					}else if(pvpLeft > 0){
						let saveOpponents = JSON.parse(await fs.readFile('./opponents.json')); 
	
						let opponentIndex  = await bestOpponentx(account, state, saveOpponents);
						let opponents
						if(state.currentState.pvp.opponents){
							opponents = state.currentState.pvp.opponents.split(',')
						} else {
							opponents = [0,0,0]
						}
	    
						browser.waitingJob = pvpLeft;
						browser.arena(opponentIndex, opponents[opponentIndex], email, pvpLeft);
					}
	
					if (missionLeft + pvpLeft == 0){
						browser.waitingJob = null;
					}
				}				
				await sleep(1000)
			}
			done();
		} catch (error) {
			let order = {
				email: job.data.email,
				password: job.data.password
			};
			console.log('error', job.data.email, error);
			await workerQueue.add(order, { 
				removeOnComplete: true,
				attempts: 5,
        		backoff: 10000
			});
            done(error);
		}
    });
	
	//first run
	await doJobs(whiteLists, workerQueue);

	//next runs at 7am
	const job = scheduleJob('7 * * *', async function(){
		await doJobs(whiteLists, workerQueue);
		await sleep(1000)
	});
})();