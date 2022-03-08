import { readFile } from 'fs/promises';
import Queue from 'bull';
import { IdleCyber, bestOpponent, teamCastoff, saveToken } from './idlecyber.js'
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
            if ((request.url() == 'https://api.idlecyber.com/pvp/reward') && request.method() == 'POST'){
                await browser.endBatle(browser.gamePage);
                
                //remove job if it in queue
                waitingJob[data.email] = 0;
                errorJob[data.email] = 0;
                
                console.log('order done: ', data.email)
                console.log()
                done()
            } 
        });

        try{
            if(data.isWhileList){
                let opponent_info = whiteLists.find(obj => obj.userId == data.opponentId);
                let opponent = new IdleCyber(opponent_info.email, opponent_info.passhash, opponent_info.token);
                let formations = await teamCastoff(opponent);

                await browser.arena(data.position);

                //team put on
                await opponent.editTeams(formations, 2);
            } else {
                await browser.arena(data.position);
            }
                    
        }catch (error){
            //add job into error queue if error
            errorJob[data.email] += 1;
            console.log('order error: ', waitingJob, errorJob)
            done(error)
        }
    });

    while (1) {
        for(const account_info of whiteLists){
            if((!waitingJob[account_info.email]) || (waitingJob[account_info.email] == 1 && errorJob[account_info.email] == 5)){
                //create Account object
                let account = new IdleCyber(account_info.email, account_info.passhash, account_info.token);
            
                if(account.account.token == ''){
                    await account.login();
                } 
                let state = await account.getState();

                if(state.currentState.pvp.remainTurn != 0){
                    let opponent = await bestOpponent(account, whiteLists);
                    let order = {
                        type: 'pvp',
                        email: account_info.email,
                        password: account_info.password
                    };
                    
                    order = {...order,...opponent};
                    
                    waitingJob[account_info.email] = 1;
                    errorJob[account_info.email] = 0;

                    keyQueue.add(order, { 
                        removeOnComplete: true,
                        attempts: 5, // If job fails it will retry till 5 times
                        backoff: 5000 // static 5 sec delay between retry
                    });
                    console.log('add order: ', account_info.email);
                    console.log();
                    //save token
                    if(account_info.token != account.account.token){
                        await saveToken(account, whiteLists);
                    }
                }                
            }
        }
        await sleep(100)
    }
})();