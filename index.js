import { readFile } from 'fs/promises';
import Queue from 'bull';
import { IdleCyber, bestOpponent, bestOpponentx, teamCastoff, saveToken } from './idlecyber.js'
import { Browser, sleep } from './launcher.js'

(async () => {
    const keyQueue = new Queue('ProcessKey');
    keyQueue.empty();

    var browser = new Browser();
    await browser.launch();

    var whiteLists = JSON.parse(await readFile('./whiteList.json')); 

    let waitingJob = {}

    let errorJob = {}

    keyQueue.process(1, async (job, done) => {
        const data = job.data;
        
        if(browser.isLogin){
            await browser.signOut();
        }
        
        await browser.login(data.email, data.password);

        browser.gamePage.on('requestfinished', async (request) => {
            if (request.url() == 'https://api.idlecyber.com/pvp/reward' && request.method() == 'POST'){
                await browser.endArena();
                await browser.signOut();

                //remove job if it in queue
                waitingJob[data.email] = 0;
                errorJob[data.email] = 0;

                done()
                                
                console.log(`${data.type} order done: ${data.email}`)
                console.log()
            }
            
            if (request.url() == 'https://api.idlecyber.com/mission_reward' && request.method() == 'POST'){
                await browser.endMission();
                await browser.signOut();

                //remove job if it in queue
                waitingJob[data.email] = 0;
                errorJob[data.email] = 0;

                done()
                                
                console.log(`${data.type} order done: ${data.email}`)
                console.log()
            }
        });

        try{
            if(data.type == 'pve'){
                await browser.campain(data.mission);
            } else {
                await browser.arena(data.position);
                // if(data.isWhileList){
                //     let opponent_info = whiteLists.find(obj => obj.userId == data.opponentId);
                //     let opponent = new IdleCyber(opponent_info.email, opponent_info.passhash, opponent_info.token);
                //     let formations = await teamCastoff(opponent);
    
                //     await browser.arena(data.position);
    
                //     //team put on
                //     await opponent.editTeams(formations, 2);
                // } else {
                //     await browser.arena(data.position);
                // }
            }                    
        }catch (error){
            //add job into error queue if error
            errorJob[data.email] += 1;
            console.log(`order error: ${data.email} --- ${errorJob[data.email]}`)
            done(error)
        }
    });

    while (1) {
        for(const account_info of whiteLists){
            if((!waitingJob[account_info.email]) || (waitingJob[account_info.email] == 1 && errorJob[account_info.email] == 3)){
                //create Account object
                let account = new IdleCyber(account_info.email, account_info.passhash, account_info.token);
                
                if(account.account.token == ''){
                    account_info.token = await account.login();
                    account_info.userId = account.account.user._id;
                } 
                let state = await account.getState();
                let order;
                
                //mission
                if(state.currentState.mission.remainTurn != 0){
                    let mission;
                    if(account_info.mission == ''){
                        mission = await account.getMission(state.currentState.mission.currentMission)
                    } else {
                        mission = await account.getMission(account_info.mission)
                    }
                   
                    order = {
                        type: 'pve',
                        email: account_info.email,
                        password: account_info.password,
                        mission: mission
                    };

                    waitingJob[account_info.email] = 1;
                    errorJob[account_info.email] = 0;

                } else if(state.currentState.pvp.remainTurn != 0){
                    // let opponent = await bestOpponent(account, whiteLists);
                    let opponentIndex = await bestOpponentx(account);

                    order = {
                        type: 'pvp',
                        email: account_info.email,
                        password: account_info.password,
                        position: opponentIndex
                    };
                                       
                    waitingJob[account_info.email] = 1;
                    errorJob[account_info.email] = 0;
                }

                if(order != undefined){
                    keyQueue.add(order, { 
                        removeOnComplete: true,
                        attempts: 3, // If job fails it will retry till 5 times
                        backoff: 5000 // static 5 sec delay between retry
                    });
                    console.log(`add ${order.type} order: ${account_info.email}`);
                    console.log();
                }
                    
                //save token
                if(account_info.token != account.account.token){
                    await saveToken(account, whiteLists);
                }
            }
        }
        await sleep(100)
    }
})();