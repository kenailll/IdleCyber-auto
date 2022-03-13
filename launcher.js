import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import { promises as fs } from 'fs'

puppeteer.use(StealthPlugin());

const sleep = function (ms) {
    return new Promise((resolve) => {
        setTimeout(resolve, ms);
    });
};

class Browser {
    constructor() {
        this.waitingJob = {};
        this.isLogin = false;
        this.pveMission = null;
        this.opponentIndex = null;
        this.opponentId = null;
        this.exit = null;
        this.tmpEmail = null;
	}

    async launch() {
        try {
            this.browser = await puppeteer.launch({
                args: [
                    '--window-size=600,900'
                ],
                executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
                headless: false,
                defaultViewport: null
            });

            this.gamePage = await this.browser.newPage();

            await this.gamePage.setRequestInterception(true);
            
            this.gamePage.on('request', request => {
                if (request.url().indexOf("mission") !== -1 && request.method() == 'GET') {
                    var url = `https://api.idlecyber.com/mission/${this.pveMission}`
                    request.continue({url: url});

                } else if (request.url().indexOf("buyPveAutoItem") !== -1) {
                    request.respond({
                        status: 200,
                        content: 'application/json',
                        headers: {
                            'access-control-allow-headers': '*',
                            'access-control-allow-origin': '*',
                            'content-type': 'application/json; charset=utf-8',
                        },
                        body: JSON.stringify({"code":"0","msg":"Success.","type":"info","data":{"amount":-500,"currency":"mIDLE"}})
                    })
                } else {
                    request.continue();
                } 
            });

            this.gamePage.on('requestfinished', async (request) => {
                if (request.url() == 'https://api.idlecyber.com/pvp/fight' && request.method() == 'POST'){
                    let opponent_data = await request.response().json();
                    console.log(opponent_data)
                    let lpTotal = 0;
                    for(const nft of opponent_data.data.opponent){
                        try {
                            lpTotal += nft.lp
                        } catch (error) {}
                    }
                    let saveOpponents = JSON.parse(await fs.readFile('./opponents.json')); 
                    saveOpponents[this.opponentId] = lpTotal;
                    await fs.writeFile('./opponents.json', JSON.stringify(saveOpponents, '', 4))
                    this.opponentId = null;
                }

                if (request.url() == 'https://api.idlecyber.com/pvp/reward' && request.method() == 'POST'){
                    await this.endArena();
                    await this.signOut();
                    
                    if(!this.isLogin){
                        console.log(`order done: ${this.tmpEmail} -- id ${this.waitingJob[this.tmpEmail]}`)
                        console.log()
                        
                        //remove job if it in queue
                        this.waitingJob[this.tmpEmail] = 0;
                        (this.exit)()
                    } else{
                        console.log('sign out err')
                    }
                }
                
                if (request.url() == 'https://api.idlecyber.com/mission_reward' && request.method() == 'POST'){
                    await this.endMission();
                    await this.signOut();

                    if(!this.isLogin){
                        console.log(`order done: ${this.tmpEmail} -- id ${this.waitingJob[this.tmpEmail]}`)
                        console.log()
                        
                        //remove job if it in queue
                        this.waitingJob[this.tmpEmail] = 0;
                        (this.exit)()
                    } else{
                        console.log('sign out err')
                    }
                }

                if (request.url() == 'https://api.idlecyber.com/pvp/opponents' && request.method() == 'GET' && this.opponentIndex != null){
                await sleep(1000);
                    //opponent
                    switch (this.opponentIndex) {
                        case 0:
                            await this.gamePage.mouse.click(140, 590, { button: 'left' });
                            break;
                        case 1:
                            await this.gamePage.mouse.click(285, 590, { button: 'left' });
                            break;
                        case 2:
                            await this.gamePage.mouse.click(430, 590, { button: 'left' });
                            break;
                    }
                    await sleep(1000)
                    //fight
                    await this.gamePage.mouse.click(290, 725, { button: 'left' });
                    await sleep(1000)
                    this.opponentIndex = null;
                }

                if (request.url() == 'https://api.idlecyber.com/user/formation?formationId=1' && request.method() == 'GET' && this.pveMission != null){
                    await sleep(1000);

                    //fight
                    await this.gamePage.mouse.click(290, 650, { button: 'left' });
                    await sleep(3000);

                    //buy auto
                    await this.gamePage.mouse.click(475, 65, { button: 'left' });
                    await sleep(500);
        
                    await this.gamePage.mouse.click(290, 440, { button: 'left' });
                    this.pveMission = null;
                }

            });

            await this.gamePage.goto('https://play.idlecyber.com/');
            await this.gamePage.waitForSelector('#loading-cover', {hidden : true, timeout: 0});
            await sleep(5000);
        } catch (error) {
            throw error
        }
    };
    
    async login(username, password){
        try {
            //username
            await sleep(500);
            await this.gamePage.mouse.click(155, 260, { button: 'left' });
            await sleep(500);
            await this.gamePage.keyboard.type(username)
            await sleep(500);
        
            //password
            await this.gamePage.mouse.click(155, 320, { button: 'left' });
            await sleep(500);
            await this.gamePage.keyboard.type(password)
            await sleep(500);
    
            //login
            await this.gamePage.mouse.click(300, 410, { button: 'left' });
            await sleep(1000);
    
            //tap to play
            await this.gamePage.mouse.click(290, 700, { button: 'left' });

            this.isLogin = true;
        } catch (error) {
            throw error
        }
    };
    
    async signOut(){
        try {
            await sleep(2000);
            await this.gamePage.mouse.click(115, 75, { button: 'left' });
            await sleep(500);
            await this.gamePage.mouse.click(180, 290, { button: 'left' });
            await sleep(1000);
            this.isLogin = false;
            await sleep(2000);
        } catch (error) {
            throw error
        }
    };
    
    async arena(opponentIndex, opponentId, tmpEmail, exitFunc){
        this.opponentIndex = opponentIndex;
        this.opponentId = opponentId;
        this.exit = exitFunc;
        this.tmpEmail = tmpEmail;
        try {
            //arena
            await sleep(1000);
            await this.gamePage.mouse.click(370, 580, { button: 'left' });
        } catch (error) {
            throw error
        }
    };

    async campain(mission, tmpEmail, exitFunc){
        this.exit = exitFunc;
        this.tmpEmail = tmpEmail;
        try {
            //mission 
            await sleep(1000);
            await this.gamePage.mouse.click(205, 580, { button: 'left' });
            this.pveMission = mission;
        } catch (error) {
            throw error
        }
    };

    async endArena() {
        try {
            //next
            await sleep(1000);
            await this.gamePage.mouse.click(390, 560, { button: 'left' });

            //back to main menu
            await sleep(2000);
            await this.gamePage.mouse.click(110, 730, { button: 'left' });
        } catch (error) {
            throw error
        }
    };

    async endMission() {
        try {
            //next
            await sleep(1000);
            await this.gamePage.mouse.click(435, 535, { button: 'left' });

            //back to main menu
            await sleep(2000);
            await this.gamePage.mouse.click(105, 720, { button: 'left' });
        } catch (error) {
            throw error
        }
    };
}


export { Browser, sleep }
// import { IdleCyber, bestOpponent, teamCastoff, saveToken } from './idlecyber.js'
// ;(async () => {
// //     var opponents = [{"point":"12XX"},{"point":"16XX"},{"point":"13XX"}]

// //     for(const opponent of opponents){
// //         opponent.point = parseInt(opponent.point.replace('XX', '00'))
// //     }

// //     var opponent = opponents.reduce((prev, current) => (+prev.point < +current.point) ? prev : current) 
// //     var opponentIndex = opponents.findIndex((obj => obj == opponent));
// //     console.log(opponentIndex)
// //     // var browser = new Browser();
    // let acc = new IdleCyber('social@cenog.net', '03ba7b02916e41465bfbde946c91a8d', '');
    // console.log((await acc.login()))
    // var mission = await acc.getState()
    
// //     // var mission = await acc.getMission(4005)
    // console.log(mission)
// //     // await browser.launch();
// //     // // await browser.login('k79pro@gmail.com', '123123123');
// //     // await browser.login('social@cenog.net', '123123123');

// //     // await browser.campain(mission);
    
// //     // await browser.signOut();

// //     // await browser.arena(2, 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoiNjIxNDhmNGZkMWNhZjYzZTgwYmI3ZjBjIiwiZW1haWwiOiJob25nbWluaDAxOEBnbWFpbC5jb20iLCJpYXQiOjE2NDY3MzkyNDh9.i_5_w9nUk8A1jHAXsfuZ8QfNyf5x1ciVuPPtWgkSXYs')
// })()


