// import { readFile } from 'fs/promises';
import { promises as fs } from 'fs'
import Queue from 'bull';
import { IdleCyber, bestOpponent, bestOpponentx, teamCastoff, saveToken } from './idlecyber.js'
import { Browser, sleep } from './launcher.js'

(async () => {
    const keyQueue = new Queue('ProcessKey');
    keyQueue.empty();

    var browser = new Browser();
    await browser.launch();

    var whiteLists = JSON.parse(await fs.readFile('./whiteList.json')); 

    keyQueue.process(1, async (job, done) => {
        const data = job.data;

        if(browser.isLogin){
            await browser.signOut();
        }

        await browser.login(data.email, data.password);

        if(data.type == 'pve'){
            await browser.campain(data.mission, data.email, done);
        } else {
            await browser.arena(data.position, data.opponent, data.email, done);
        } 
    });

    while (1) {
        if(!(await keyQueue.count())){
            for(const account_info of whiteLists){
                if((!browser.waitingJob[account_info.email])){
                    //create Account object
                    let account = new IdleCyber(account_info.email, account_info.passhash, account_info.token);
                    
                    if(account.account.token == ''){
                        account_info.token = await account.login();
                        if(account_info.token == 0){
                            continue
                        }
                        account_info.userId = account.account.user._id;
                    } 
                    let state = await account.getState();
                    if(state == 0){
                        continue
                    }
    
                    let order;
                    
                    if(state.currentState.mission.remainTurn != 0){                    // mission
                        let mission;
                        if(account_info.mission == ''){
                            mission = state.currentState.mission.currentMission
                        } else {
                            mission = account_info.mission
                        }
                        
                        order = {
                            type: 'pve',
                            email: account_info.email,
                            password: account_info.password,
                            mission: mission
                        };
    
                    } else if(state.currentState.pvp.remainTurn != 0){                  // arena
                        // let opponent = await bestOpponent(account, whiteLists);
                        let saveOpponents = JSON.parse(await fs.readFile('./opponents.json')); 

                        let opponentIndex = await bestOpponentx(account, saveOpponents);
                        let opponents = state.currentState.pvp.opponents.split(',')
                        order = {
                            type: 'pvp',
                            email: account_info.email,
                            password: account_info.password,
                            position: opponentIndex,
                            opponent: opponents[opponentIndex]
                        };
                    }
    
                    if(order != undefined){
                        let job = await keyQueue.add(order, { 
                            removeOnComplete: true
                        });
    
                        browser.waitingJob[account_info.email] = job.id;
                        console.log(`add ${order.type} order: ${account_info.email} -- id :${browser.waitingJob[account_info.email]}`);
                        console.log();
                    }
                        
                    //save token
                    if(account_info.token != account.account.token){
                        await saveToken(account, whiteLists);
                    }
                }
            }
        }
        await sleep(500)
    }
})();