import axios from "axios";
import { writeFile } from 'fs/promises';
// import https_proxy from 'https-proxy-agent';
// const { HttpsProxyAgent } = https_proxy;

// var agent = new HttpsProxyAgent('http://127.0.0.1:8080/');


class IdleCyber {
	constructor(email, password, token) {
        this.app = axios.create({
            baseURL: 'https://api.idlecyber.com/',
        });
        this.account = {};
        this.email = email;
        this.password = password;
        this.account.token = token;

        this.postConfig = {
            headers: {
                'accept': 'application/json',
                'content-type': 'application/json',
                'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/98.0.4758.102 Safari/537.36 Edg/98.0.1108.62',
                'x-client-version': 19,
            },
            // httpsAgent: agent,
        };

        if(token != ''){
            this.postConfig.headers['x-access-token'] = token;
        }
	}

	async login() {
        let params = {
            email: this.email,
            password: this.password
        };

        let postConfig = {
            headers: {
                'accept': 'application/json; charset=utf-8',
                'content-type': 'application/json',
                'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/98.0.4758.102 Safari/537.36 Edg/98.0.1108.62',
                'x-client-version': 19
            },
            // httpsAgent: agent,
        };

        var res = await this.app.post('/user/login', params, postConfig);
        
        this.account = res.data.data
        this.postConfig.headers['x-access-token'] = this.account.token

        return this.account.token
	}

	async getState() {
        try {
            var res = await this.app.get('/user/state', this.postConfig);
            this.account.user.currentState = res.data.data.currentState
        } catch (error) {
            await this.login();
            await this.getState();
        }
        return this.account.user
	}

	async getOpponents(result) {
        try {
            var res = await this.app.get('/pvp/opponents', this.postConfig);
            result = res.data.data.opponents
        } catch (error) {
            await this.login();
            result = await this.getOpponents(result);
        }
        return result
	}

    //formationId = 1: campain team
    //formationId = 2: areana defense team
    //formationId = 3: arena attack team
    // data: { code: '97', msg: 'Invalid token.', type: 'critical' }
	async getTeams(formationId, result) {
        var res = await this.app.get(`/user/formation?formationId=${formationId}`, this.postConfig);

        if(res.data.code == '0'){
            result = res.data
        } else {
            await this.login();
            result = await this.getTeams(formationId, result);
        }
        return result
	}

    //formations: list of formations _id as array
    //formationId: team id (see getTeams method)
	async editTeams(formation, formationId, result) {
        if(formation.length == 0){
            formation = [,,,,,,]
        }
        let params = {
            formation: formation.toString(),
            formationId: formationId.toString()
        };

        var res = await this.app.post(`/user/formation`, params, this.postConfig);
        
        if(res.data.code == '0'){
            result = res.data
        } else {    
            await this.login();
            result = await this.editTeams(formation, formationId, result);
        }
        return result
	}
}


//accounts: IdleCyber object
//whiteLists: list of accounts info
const bestOpponent = async (account, whiteLists) => {
    //get opponents list
    var opponents = await account.getOpponents();
    // get team LP
    var LP = (await account.getTeams(3)).lp;

    //lọc ra những opponents thuộc white list
    const intersection = whiteLists.filter(item1 => opponents.some(item2 => item1.userId === item2.userId))

    var opponent
    var isWhileList = true 
    if (intersection.length != 0){
        //nếu có opponents thuộc white list
        //tìm opponent có elo cao nhất
        opponent = intersection.reduce((prev, current) => (+prev.point > +current.point) ? prev : current) 
    } else {
        //nếu không có opponents thuộc white list
        //lọc ra opponents có LP < team LP
        const filter = opponents.filter(item => item.lp < LP)
    
        if(filter.length != 0){
            //tìm opponent có elo cao nhất
            opponent = filter.reduce((prev, current) => (+prev.point > +current.point) ? prev : current)
        } else {
            //tìm opponent có lp thấp nhất
            opponent = opponents.reduce((prev, current) => (+prev.lp < +current.lp) ? prev : current) 
        }
        isWhileList = false
    }

    let opponentIndex = opponents.findIndex((obj => obj.userId == opponent.userId));

    return {opponentId: opponent.userId, position: opponentIndex, isWhileList: isWhileList}
};


//accounts: IdleCyber object
const teamCastoff = async (accounts) => {
    //get team info
    var team = (await accounts.getTeams(2)).formation;

    //get _id array from team info
    var formations = team.map(formation => {
            if(formation != null){
                return formation._id
            } else {
                return ''
            }
        });
    
    //team cast off
    await accounts.editTeams([], 2);

    return formations
};


//save token
const saveToken = async (account, whiteLists) => {
    var accountIndex = whiteLists.findIndex((obj => obj.email == account.email));

    if(accountIndex == -1){
        whiteLists.push({
            'userId': account.account.user._id,
            'token': account.account.token
        });
    } else {
        whiteLists[accountIndex].userId = account.account.user._id;
        whiteLists[accountIndex].token = account.account.token;
    }

    await writeFile('./whiteList.json', JSON.stringify(whiteLists, '', 4))
};

export { IdleCyber, bestOpponent, teamCastoff, saveToken }