import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import { promises as fs } from 'fs';
import { installMouseHelper } from './mouse-highlighter.js';
puppeteer.use(StealthPlugin());

const sleep = function (ms) {
    return new Promise((resolve) => {
        setTimeout(resolve, ms);
    });
};

class Browser {
    constructor() {
        this.running = false;
    }

    async launch(){
        try {
            this.browser = await puppeteer.launch({
                args: [
                    '--window-size=600,900',
					'--no-sandbox',
					'--disable-setuid-sandbox',
					'--disable-dev-shm-usage',
					'--disable-background-timer-throttling',
					'--disable-backgrounding-occluded-windows',
					'--disable-renderer-backgrounding',
                    '--start-maximized',
                ],
                executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
                headless: false,
                defaultViewport: null
            });

            this.gamePage = await this.browser.newPage();
            await installMouseHelper(this.gamePage)
            await this.gamePage.setRequestInterception(true);

			this.gamePage.on('response', async (response) => {
                if (response.url() == "https://api.idlecyber.com/user/login" && response.status() == 200){

					const body = await response.json();
					this.account = body.data;
				}
            });
			
            this.gamePage.on('request', request => {
                var headers =  request.headers();
                if ('x-client-version' in headers){
                    headers['x-client-version'] = 28;
                }

                if (request.url().indexOf("mission") !== -1 && request.method() == 'GET') {
                    var url = `https://api.idlecyber.com/mission/${this.pveMission}`;
                    request.continue({url: url, headers: headers});

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
                    request.continue({headers: headers});
                } 
            });

            this.gamePage.on('requestfinished', async (request) => {
                if (request.url() == 'https://api.idlecyber.com/pvp/fight' && request.method() == 'POST'){
                    let opponent_data = await request.response().json();
                    let lpTotal = 0;
                    for(const nft of opponent_data.data.defFormation){
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
					await sleep(4000);
                    await this.endArena();

                    //log reports
                    let reward_data = await request.response().json();
                    try {
                        await this.report(reward_data);
                    } catch (error) {}
                    
                    console.log(`Order done --- Arena --- ${this.tmpEmail} -- turn: ${this.waitingJob}`)
					console.log()
					
					this.waitingJob = 0;
                }
                
                if (request.url() == 'https://api.idlecyber.com/mission_reward' && request.method() == 'POST'){
					await sleep(4000);
                    await this.endMission();

                    //log reports
                    let reward_data = await request.response().json();
                    try {
                        await this.report(reward_data);
                    } catch (error) {}

					console.log(`Order done --- Mission --- ${this.tmpEmail} -- turn: ${this.waitingJob}`)
					console.log()
					this.waitingJob = this.waitingJob - 1;

					if(this.waitingJob < 1){
						this.waitingJob = 0;
					}else{
						await this.campain(this.pveMission, this.tmpEmail, this.waitingJob);
					}
                }

                if (request.url() == 'https://api.idlecyber.com/pvp/opponents' && request.method() == 'GET' && this.opponentIndex != null){
					await sleep(1000);
                    //opponent
                    switch (this.opponentIndex) {
                        case 0:
                            await this.gamePage.mouse.click(165, 510, { button: 'left' });
                            break;
                        case 1:
                            await this.gamePage.mouse.click(285, 510, { button: 'left' });
                            break;
                        case 2:
                            await this.gamePage.mouse.click(410, 510, { button: 'left' });
                            break;
                    }
                    await sleep(1000)
                    //fight
                    await this.gamePage.mouse.click(295, 600, { button: 'left' });
                    await sleep(1000)
                    this.opponentIndex = null;
                }
            });
            await this.gamePage.goto('https://play.idlecyber.com/');
            await this.gamePage.waitForSelector('#loading-cover', {hidden : true, timeout: 0});
        } catch (error) {
            console.log(error);
        }
    }

    async init(tmpEmail, tmpPassword){
        this.running = true;

        this.tmpEmail = tmpEmail;
        this.tmpPassword = tmpPassword;
        
        this.waitingJob = undefined;
        this.pveMission = null;
        this.opponentIndex = null;
        this.opponentId = null;
		this.tmpToken = null;
		this.left = null;
		this.account = null;
        this.reports = {mIDLE: 0, exp: 0};

        try {
            await sleep(3000);
			await this.login(this.tmpEmail, this.tmpPassword)
        } catch (error) {
            console.log(error);
        }
    };
    
    async login(username, password){
        try {
            console.log(`${username} --- login`);

			//username
            await sleep(3000);
			await this.gamePage.mouse.click(300, 220, { button: 'left' });
			await sleep(300);
            await this.gamePage.mouse.click(300, 220, { button: 'left' });
            await sleep(500);
            await this.gamePage.keyboard.type(username)
            await sleep(1000);

            //password
			await this.gamePage.mouse.click(300, 260, { button: 'left' });
			await sleep(300);
            await this.gamePage.mouse.click(300, 260, { button: 'left' });
            await sleep(500);
            await this.gamePage.keyboard.type(password)
            await sleep(1000);

            //login
            await this.gamePage.mouse.click(300, 350, { button: 'left' });
            await sleep(1000);
    
            //tap to play
            await this.gamePage.mouse.click(285, 600, { button: 'left' });

        } catch (error) {
            console.log(error);
        }
    };
    
    async signOut(){
        try {
			await this.backHome();
            await sleep(2000);
            await this.gamePage.mouse.click(140, 70, { button: 'left' });
            await sleep(500);
            await this.gamePage.mouse.click(195, 245, { button: 'left' });
            await sleep(1000);
			this.pveMission = null;
            this.running = false;
            await sleep(1000);
        } catch (error) {
            console.log(error);
        }
    };
    
    async arena(opponentIndex, opponentId, tmpEmail, left){
        this.opponentIndex = opponentIndex;
        this.opponentId = opponentId;
        this.tmpEmail = tmpEmail;
        this.left = left;
        try {
			await this.backHome();
            console.log(`Start arena --- ${tmpEmail} --- turn: ${this.waitingJob}`)

            await sleep(1000);
            await this.gamePage.mouse.click(360, 495, { button: 'left' });
        } catch (error) {
            console.log(error);
        }
    };

    async campain(mission, tmpEmail, left){
        this.tmpEmail = tmpEmail;
        this.left = left;
        this.waitingJob = left;
		
        try {
            await this.backHome();
			console.log(`Start campain --- ${tmpEmail} --- mission: ${mission} --- turn: ${this.waitingJob}`)
			
            this.pveMission = mission;
            
            //mission 		
			await sleep(1000);
            await this.gamePage.mouse.click(220, 495, { button: 'left' });
			await sleep(2000);

			//fight
			await this.gamePage.mouse.click(290, 560, { button: 'left' });
			await sleep(4000);

			//buy auto
			await this.gamePage.mouse.click(450, 60, { button: 'left' });
			await sleep(500);

			await this.gamePage.mouse.click(290, 375, { button: 'left' });
        } catch (error) {
            console.log(error);
        }
    };

    async backHome() {
        try {
            await sleep(2000);
            await this.gamePage.mouse.click(140, 600, { button: 'left' });
			await sleep(1000);
            await this.gamePage.mouse.click(140, 600, { button: 'left' });
        } catch (error) {
            console.log(error);
        }
    };
	
    async endArena() {
        try {
			// console.log('endArena')
            await sleep(1000);
            await this.gamePage.mouse.click(360, 460, { button: 'left' });

            //back to main menu
            await this.backHome();
        } catch (error) {
            console.log(error);
        }
    };

    async endMission() {
        try {
			// console.log('endMission')
            await sleep(1000);
            await this.gamePage.mouse.click(415, 440, { button: 'left' });

            //back to main menu
            await this.backHome();
        } catch (error) {
            console.log(error);
        }
    };
	
    async report(reward_data){
        this.reports.mIDLE += reward_data.data.rewards[0].amount
        this.reports.exp += reward_data.data.rewards[1].amount
    }

	async exit(){
        await this.gamePage.close();
        this.running = false;
	}
}

export { Browser, sleep }