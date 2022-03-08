import axios from "axios";
import { readFile } from 'fs/promises';

class IdleCyber {
	constructor(email, password) {
        this.app = axios.create({
            baseURL: 'https://api.idlecyber.com/',
        });
	}

	async login() {
        let params = {
            email: email,
            password: password
        };

        let postConfig = {
            headers: {
                'accept': 'application/json',
                'content-type': 'application/json',
                'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/98.0.4758.102 Safari/537.36 Edg/98.0.1108.62',
                'x-client-version': 18
            }
        };

        var res = await this.app.post('/user/login', params, postConfig);
        this.account = res.data.data
        return this.account.token
	}

	async getState() {
        let postConfig = {
            headers: {
                'accept': 'application/json',
                'content-type': 'application/json',
                'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/98.0.4758.102 Safari/537.36 Edg/98.0.1108.62',
                'x-client-version': 18,
                'x-access-token': this.account.token
            }
        };

        var res = await this.app.get('/user/state', postConfig);
        this.account.user.currentState = res.data.data.currentState
        return this.account.user.currentState
	}

	async getOpponents() {
        let postConfig = {
            headers: {
                'accept': 'application/json',
                'content-type': 'application/json',
                'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/98.0.4758.102 Safari/537.36 Edg/98.0.1108.62',
                'x-client-version': 18,
                'x-access-token': this.account.token
            }
        };

        var res = await this.app.get('/pvp/opponents', postConfig);
        return res.data.data.opponents
	}

    //formationId = 1: campain team
    //formationId = 2: areana defense team
    //formationId = 3: arena attack team
	async getTeams(formationId) {
        let postConfig = {
            headers: {
                'accept': 'application/json',
                'content-type': 'application/json',
                'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/98.0.4758.102 Safari/537.36 Edg/98.0.1108.62',
                'x-client-version': 18,
                'x-access-token': this.account.token
            }
        };
        var res = await this.app.get(`user/formation?formationId=${formationId}`, postConfig);
        return res.data.data
	}
}

const bestOpponent = async (accounts, whiteLists) => {
    //get opponents list
    var opponents = await accounts.getOpponents();

    // get team LP
    var LP = (await accounts.getTeams(3)).lp;

    //lọc ra những opponents thuộc white list và có LP < team LP
    const intersection = whiteLists.filter(item1 => opponents.some(item2 => item1.userId === item2.userId && item1.lp < LP))

    var opponent
    if (intersection.length != 0){
        //nếu có opponents thuộc white list và có LP < team LP
        //tìm opponent có elo cao nhất
        opponent = intersection.reduce((prev, current) => (+prev.point > +current.point) ? prev : current)
    } else {
        //nếu không có opponents thuộc white list
        //lọc ra opponents có LP < team LP
        const filter = opponents.filter(item => item.lp < LP)
        //tìm opponent có elo cao nhất
        opponent = filter.reduce((prev, current) => (+prev.point > +current.point) ? prev : current)
    }

    return opponent
};


var email = 'social@cenog.net';
var password = '03ba7b02916e41465bfbde946c91a8d9';

//login to account
var acc = new IdleCyber(email, password); 
await acc.login();

//get whitelist accounts
const whiteLists = JSON.parse(await readFile('./whiteList.json')); 

var opponent = await bestOpponent(acc, whiteLists)

console.log(opponent)