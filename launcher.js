import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';

puppeteer.use(StealthPlugin());

const sleep = function (ms) {
    return new Promise((resolve) => {
        setTimeout(resolve, ms);
    });
};

class Browser {
    constructor() {
        this.isLogin = false;
        this.pveMission = '';
	}

    async launch() {
        try {
            this.browser = await puppeteer.launch({
                args: [
                    '--window-size=600,900',
                //   '--proxy-server=127.0.0.1:9876',
                //   // Use proxy for localhost URLs
                //   '--proxy-bypass-list=<-loopback>',
                ],
                executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
                headless: false,
                defaultViewport: null
            });

            this.gamePage = await this.browser.newPage();

            await this.gamePage.setRequestInterception(true);

            this.gamePage.on('request', request => {
                if (request.url().indexOf("mission") !== -1 && request.method() == 'GET') {
                    // request.respond({
                    //     content: 'application/json',
                    //     headers: {
                    //         'access-control-allow-headers': '*',
                    //         'access-control-allow-origin': '*',
                    //         'content-encoding': 'br',
                    //         'content-type': 'application/json; charset=utf-8',
                    //     },
                    //     body: JSON.stringify(this.pveMission)
                    // })
                    var url = `https://api.idlecyber.com/mission/${this.pveMission}`
                    console.log(url)
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
            await sleep(2000);
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
            this.isLogin = false;
            await sleep(2000);
        } catch (error) {
            throw error
        }
    };
    
    async arena(opponentIndex){
        try {
            //arena 
            await this.gamePage.mouse.click(370, 580, { button: 'left' });
            await sleep(1000);
            //opponent
            switch (opponentIndex) {
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
            await sleep(1500);
    
            //fight
            await this.gamePage.mouse.click(290, 725, { button: 'left' });
        } catch (error) {
            throw error
        }
    };

    async campain(mission){
        this.pveMission = mission;
        try {
            //arena 
            await this.gamePage.mouse.click(205, 580, { button: 'left' });
            await sleep(1000);

            //fight
            await this.gamePage.mouse.click(290, 650, { button: 'left' });
            await sleep(3000);

            //buy auto
            await this.gamePage.mouse.click(475, 65, { button: 'left' });
            await sleep(500);

            await this.gamePage.mouse.click(290, 440, { button: 'left' });
        } catch (error) {
            throw error
        }
    };

    async endArena() {
        try {
            //next
            await sleep(1000);
            await this.gamePage.mouse.click(390, 560, { button: 'left' });
            await sleep(2000);
    
            //back to main menu
            await this.gamePage.mouse.click(110, 730, { button: 'left' });
            await sleep(500);
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

            await sleep(500);
        } catch (error) {
            throw error
        }
    };
}


export { Browser, sleep }
import { IdleCyber, bestOpponent, teamCastoff, saveToken } from './idlecyber.js'
// ;(async () => {
// //     var opponents = [{"point":"12XX"},{"point":"16XX"},{"point":"13XX"}]

// //     for(const opponent of opponents){
// //         opponent.point = parseInt(opponent.point.replace('XX', '00'))
// //     }

// //     var opponent = opponents.reduce((prev, current) => (+prev.point < +current.point) ? prev : current) 
// //     var opponentIndex = opponents.findIndex((obj => obj == opponent));
// //     console.log(opponentIndex)
// //     // var browser = new Browser();
//     let acc = new IdleCyber('social@cenog.net', '03ba7b02916e41465bfbde946c91a8d9', '');
//     var mission = await acc.getState()
    
// //     // var mission = await acc.getMission(4005)
//     console.log(mission)
// //     // await browser.launch();
// //     // // await browser.login('k79pro@gmail.com', '123123123');
// //     // await browser.login('social@cenog.net', '123123123');

// //     // await browser.campain(mission);
    
// //     // await browser.signOut();

// //     // await browser.arena(2, 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoiNjIxNDhmNGZkMWNhZjYzZTgwYmI3ZjBjIiwiZW1haWwiOiJob25nbWluaDAxOEBnbWFpbC5jb20iLCJpYXQiOjE2NDY3MzkyNDh9.i_5_w9nUk8A1jHAXsfuZ8QfNyf5x1ciVuPPtWgkSXYs')
// })()


