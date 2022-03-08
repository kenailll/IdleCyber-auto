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
                request.continue();
            });

            await this.gamePage.goto('https://play.idlecyber.com/');
            await this.gamePage.waitForSelector('#loading-cover', {hidden : true, timeout: 45000});
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
            console.log('arena')
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

    async endBatle() {
        try {
            //next
            await sleep(2000);
            await this.gamePage.mouse.click(390, 560, { button: 'left' });
            await sleep(1000);
    
            //back to main menu
            await this.gamePage.mouse.click(110, 730, { button: 'left' });
            await sleep(500);
        } catch (error) {
            throw error
        }
    };
}


export { Browser, sleep }

// ;(async () => {
//     var browser = new Browser();
//     await browser.launch();
//     // await browser.login('k79pro@gmail.com', '123123123');
//     await browser.login('social@cenog.net', '123123123');
//     await browser.signOut();

//     // await browser.arena(2, 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoiNjIxNDhmNGZkMWNhZjYzZTgwYmI3ZjBjIiwiZW1haWwiOiJob25nbWluaDAxOEBnbWFpbC5jb20iLCJpYXQiOjE2NDY3MzkyNDh9.i_5_w9nUk8A1jHAXsfuZ8QfNyf5x1ciVuPPtWgkSXYs')
// })()

// // // await this.gamePage.mouse.click(205, 580, { button: 'left' }); //campain
