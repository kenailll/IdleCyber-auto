import axios from "axios";
// import { writeFile } from 'fs/promises';
import { promises as fs } from 'fs'

class IdleCyber {
	constructor(email, token, accountData) {
        this.app = axios.create({
            baseURL: 'https://api.idlecyber.com/',
        });
        this.account = accountData;
        this.email = email;
        this.account.token = token;
        this.postConfig = {
            headers: {
                'accept': 'application/json',
                'content-type': 'application/json',
                'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/98.0.4758.102 Safari/537.36 Edg/98.0.1108.62',
                'x-client-version': 27,
            },
        };

        if(token != '' && token != 0){
            this.postConfig.headers['x-access-token'] = token;
        }
	}

	async getQuests() {
        try {
            var res = await this.app.get('/quests', this.postConfig);
			for (const q of res.data.data.quests) {
				if (q.status == "done") {
					let params = {
						questId: q.questId
					};
					const qres = await this.app.post(`/quest/claim`, params, this.postConfig);
					if(qres.data.code == '0'){
						console.log(`${q.questId} Done Claimed`)	
					}
				}
			}
        } catch (error) {
			console.log(this.email, "error getQuests()");
        }
        return
	}
	
	async getState() {
        try {
            var res = await this.app.get('/user/state', this.postConfig);
            this.account.user.currentState = res.data.data.currentState;
        } catch (error) {
			console.log(this.email, "error getState()");
        }
        return this.account.user
	}

	async getMission(mission, result) {
        var res = await this.app.get(`/mission/${mission}`, this.postConfig);
        if(res.data.code == '0'){
            result = res.data
        } else if (res.data.code == '23'){
            result = await this.getMission(missionDown(mission, 1), result)
        } else {
			console.log(this.email, "error getMission()");
        }
        return result
	}

	async getOpponents(result) {
        try {
            var res = await this.app.get('/pvp/opponents', this.postConfig);
            result = res.data.data.opponents
        } catch (error) {
			console.log(this.email, "error getOpponents()");
			//console.log(error);
            // await this.login();
            // result = await this.getOpponents(result);
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
			console.log(this.email, "error getTeams()");
            // await this.login();
            // result = await this.getTeams(formationId, result);
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
			console.log(this.email, "error editTeams()");
            // await this.login();
            // result = await this.editTeams(formation, formationId, result);
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

const bestOpponentx = async (account, state, whiteLists) => {
    //get opponents list
    var opponents
    if(state.currentState.pvp.opponents){
        opponents = state.currentState.pvp.opponents.split(',');
    } else {
        return 0
    }
    var LP = (await account.getTeams(3)).lp;
	
    for(var i=0; i<3; i++){
        if(whiteLists[opponents[i]] != undefined && whiteLists[opponents[i]] < LP){
            return i;
        }
    }

    for(var i=0; i<3; i++){
        if(whiteLists[opponents[i]] == undefined){
            return i;
        }
    }
	
    opponents = await account.getOpponents();

    for(const opponent of opponents){
        opponent.point = parseInt(opponent.point.replace('XX', '00'))
    }

    var opponent = opponents.reduce((prev, current) => (+prev.point < +current.point) ? prev : current) 
    var opponentIndex = opponents.findIndex((obj => obj == opponent));
    return opponentIndex;
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

    await fs.writeFile('./whiteList.json', JSON.stringify(whiteLists, '', 4))
	return whiteLists;
};


function missionDown(mission, step) {
    mission = parseInt(mission);
    for(var i=0; i<step; i++){
        if(mission == 1001){
            return `${mission}`
        }
    
        if((mission - 1) % 1000 == 0){
            mission = mission - 1 - 1000 + 6;
        } else {
            mission -= 1;
        }
    }
    return `${mission}`
}

export { IdleCyber, bestOpponent, bestOpponentx, teamCastoff, saveToken, missionDown }

