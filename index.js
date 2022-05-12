// import { readFile } from 'fs/promises';
import { promises as fs } from 'fs'
import Queue from 'bull';
import { IdleCyber, bestOpponentx, teamCastoff, saveToken } from './idlecyber.js'
import { Browser, sleep } from './launcher720.js'
import { scheduleJob } from 'node-schedule';

async function doJobs(whiteLists, queue) {
	for(const account_info of whiteLists){
		const order = {
			email: account_info.email,
			password: account_info.password
		};
		console.log(order);
		await queue.add(order, { 
			removeOnComplete: true
		});
	}
}

(async () => {
    const keyQueue = new Queue('ProcessKey');
    const workerQueue = new Queue('WorkerKey');

	await keyQueue.obliterate({ force: true });
	await workerQueue.obliterate({ force: true });

	await sleep(1000)
	let wBrowser = {}
	const whiteLists = JSON.parse(await fs.readFile('./whiteList.json')); 

	//Browser init-login
    keyQueue.process(2, async (job, done) => {
        const data = job.data;
		const email = data.email;
		const password = data.password;

		var browser = new Browser(email, password);
		wBrowser[email] = browser;
		browser.launch();
		
		while(true){
			if (browser.runningJob == 1 && browser.tmpToken != null){
				browser.runningJob = 2;
				await workerQueue.add({email: email}, { 
					removeOnComplete: true
				});
			}
			if (browser.runningJob == 3){
				//log reports
				let reports = JSON.parse(await fs.readFile('./reports.json')); 
				let date = new Date().toLocaleDateString();

				if(reports[email] == undefined){
					reports[email] = {};
				}
		
				if(reports[email][date] == undefined){
					reports[email][date] = browser.reports;
				} else {
					reports[email][date].mIDLE = browser.reports.mIDLE;
					reports[email][date].exp = browser.reports.exp;
				}
				await fs.writeFile('./reports.json', JSON.stringify(reports, '', 4))
				
				break;
			}
			await sleep(1000)
		}
		done();
    });

	//Job start
	workerQueue.process(2, async (job, done) => {
        const email = job.data.email;
		const accountIndex = whiteLists.findIndex((obj => obj.email == email));
		while(true){
			let browser = wBrowser[email];

			let waitJob = browser.waitingJob[email];
			
			if (waitJob === null){
				let account = new IdleCyber(email, browser.tmpToken, browser.account);
				await account.getQuests();
				try{
					await browser.exit();
					console.log(`${email} --- exit`)
				}catch{}
				browser.runningJob = 3;
				break;
			}
			
			if(waitJob == undefined || waitJob == 0){
				let account = new IdleCyber(email, browser.tmpToken, browser.account);
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
					browser.waitingJob[email] = missionLeft;
					browser.campain(mission, email, browser.waitingJob[email]);
				}else if(pvpLeft > 0){
					let saveOpponents = JSON.parse(await fs.readFile('./opponents.json')); 

					let opponentIndex  = await bestOpponentx(account, state, saveOpponents);
					let opponents
					if(state.currentState.pvp.opponents){
						opponents = state.currentState.pvp.opponents.split(',')
					} else {
						opponents = [0,0,0]
					}
    
					browser.waitingJob[email] = pvpLeft;
					browser.arena(opponentIndex, opponents[opponentIndex], email, pvpLeft);
				}

				if (missionLeft + pvpLeft == 0){
					browser.waitingJob[email] = null;
				}
			}
			
			await sleep(1000)
		}
		done();
    });
	
	//first run
	await doJobs(whiteLists, keyQueue);

	//next runs at 7am
	const job = scheduleJob('7 * * *', async function(){
		await doJobs(whiteLists, keyQueue);
		await sleep(1000)
	});
})();