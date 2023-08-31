const fs = require('fs');
//I HAVE NO FUCKING IDEA HOW JAVASCRIPT/node WORKS LMAO i'm just writing this in np++
//ouch ouch my eyes!! (what i sound like when i use np++ because any theme other than the white one is broken in one way or another)
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

let confFname = 'conf.json';
if(process.argv[2]) {
	confFname = process.argv[2];
}
const conf = JSON.parse(fs.readFileSync(confFname, 'utf8'));

const QUERIES = {
	FOLLOWING: {
		id: 'lE9JJNkmW6PLDjq4yAocYw',
		name: 'Following',
		features: '{"rweb_lists_timeline_redesign_enabled":true,"responsive_web_graphql_exclude_directive_enabled":true,"verified_phone_label_enabled":false,"creator_subscriptions_tweet_preview_api_enabled":true,"responsive_web_graphql_timeline_navigation_enabled":true,"responsive_web_graphql_skip_user_profile_image_extensions_enabled":false,"tweetypie_unmention_optimization_enabled":true,"responsive_web_edit_tweet_api_enabled":true,"graphql_is_translatable_rweb_tweet_is_translatable_enabled":true,"view_counts_everywhere_api_enabled":true,"longform_notetweets_consumption_enabled":true,"tweet_awards_web_tipping_enabled":false,"freedom_of_speech_not_reach_fetch_enabled":true,"standardized_nudges_misinfo":true,"tweet_with_visibility_results_prefer_gql_limited_actions_policy_enabled":false,"longform_notetweets_rich_text_read_enabled":true,"longform_notetweets_inline_media_enabled":false,"responsive_web_enhance_cards_enabled":false}'
	},
	FOLLOWERS: {
		id: 'JR06UYllAD0SHuRvUDZQ4A',
		name: 'Followers',
		features: '{"rweb_lists_timeline_redesign_enabled":true,"responsive_web_graphql_exclude_directive_enabled":true,"verified_phone_label_enabled":false,"creator_subscriptions_tweet_preview_api_enabled":true,"responsive_web_graphql_timeline_navigation_enabled":true,"responsive_web_graphql_skip_user_profile_image_extensions_enabled":false,"tweetypie_unmention_optimization_enabled":true,"responsive_web_edit_tweet_api_enabled":true,"graphql_is_translatable_rweb_tweet_is_translatable_enabled":true,"view_counts_everywhere_api_enabled":true,"longform_notetweets_consumption_enabled":true,"tweet_awards_web_tipping_enabled":false,"freedom_of_speech_not_reach_fetch_enabled":true,"standardized_nudges_misinfo":true,"tweet_with_visibility_results_prefer_gql_limited_actions_policy_enabled":false,"longform_notetweets_rich_text_read_enabled":true,"longform_notetweets_inline_media_enabled":false,"responsive_web_enhance_cards_enabled":false}'
	}
}

//time in MILLISECS
async function Halt(time) {
	return await new Promise(resolve => setTimeout(resolve, time));
}

//target in UNIX SECS
async function DealRateLimit(target) {
	while((Date.now() / 1000) < target) {
		console.log(`rate limited, resuming in ${target - Date.now() / 1000} secs`);
		await Halt(10000);
	}
}

async function SafeFetch(...args) {
	try {
		return await fetch(...args);
	} catch(e) {
		let message = e.toString();
		let wait = 10 * 60 * 1000;
		switch(e.code) {
			case 'ECONNABORTED':
			case 'ECONNRESET':
			case 'ETIMEDOUT':
				message = `Internet's having a stroke (code ${e.code}), retrying in 10 minutes`;
				break;
			case 'ENOTFOUND':
				message = "Internet's out, trying again in 1 minute";
				wait = 1 * 60 * 1000;
				break;
		}
		console.log(message);
		await Halt(wait);
		return await SafeFetch(...args);
	}
}

async function DoRequest(query, body, param) {
	let paramReal = '';
	//uhhh fuckin there's probably a better way to do this with js magic but i touch grass so i'm doing it in a sane way
	//so that people that speak the english language, spoken in 41 countries, may understand this code
	if(param) {
		paramReal += '?';
		for(let i = 0; i < param.length; i++) {
			paramReal += `${param[i][0]}=`
			paramReal += encodeURIComponent(param[i][1]);
			if(i != param.length-1) {
				paramReal += "&"
			}
		}
	}
	//console.log(`https://twitter.com/i/api/graphql/${query.id}/${query.name}${paramReal}`);
	let resp = await SafeFetch(`https://twitter.com/i/api/graphql/${query.id}/${query.name}${paramReal}`, {
	"headers": {
		"accept": "*/*",
		"accept-language": "en-US,en;q=0.9",
		"authorization": `${conf.auth}`,
		"content-type": "application/json",
		"sec-ch-ua": "\"Chromium\";v=\"112\", \"Google Chrome\";v=\"112\", \"Not:A-Brand\";v=\"99\"",
		"sec-ch-ua-mobile": "?0",
		"sec-ch-ua-platform": "\"Windows\"",
		"sec-fetch-dest": "empty",
		"sec-fetch-mode": "cors",
		"sec-fetch-site": "same-origin",
		"x-csrf-token": `${conf.csrf}`,
		"x-twitter-active-user": "yes",
		"x-twitter-auth-type": "OAuth2Session",
		"x-twitter-client-language": "en",
		"cookie": `${conf.cookie}`,
		"Referer": "https://twitter.com/",
		"Referrer-Policy": "strict-origin-when-cross-origin"
	},
	"body": body,
	"method": "GET"
	});
	switch(resp.status) {
		//lets, shhhh, for now, hope it doesn't happen
		//(commented because of that resp.json call)
		case 200:
			/*let jay = await resp.json(); //space jam dvd
			if(jay.errors) {
				console.log('THERE WERE', jay.errors.length, 'ERRORS, FUCK');
				for(let i = 0; i < jay.errors.length; i++) {
					error = jay.errors[i];
					console.log(`Error ${i+1}: code ${error.code}, message: "${error.message}"`);
				}
				console.log('Current time:', Date(), Date.now() / 1000);
				console.log('Attempting to try again in 30.5 minutes god fucking daaaaaamn eat my ass twitter.');
				await Halt((((30 * 60)*1000)) + 30000);
				return await DoRequest(query, body, param);
			}*/
			return resp;
			break;
		case 429:
			await DealRateLimit(resp.headers.get('x-rate-limit-reset'));
			return await DoRequest(query, body, param);
			break;
		default:
			console.log(resp.status);
			return resp;
			break;
	}
}

//i'm gonna be running this on my shitphone so i can't afford to store twitter's extremely wasteful and redundant jsons
async function GetUsers(query) {
	let result = [];
	let cursor = '';
	while(cursor != "STOP") {
		if(cursor != '') {
			cursor = `"cursor":"${cursor}",`;
		}
		let resp = await DoRequest(query, null, [
			['variables',`{"userId":"${conf.userId}",${cursor}"count":100,"includePromotedContent":false}`],
			['features', query.features]
		]);
		let json = await resp.json();
		let hadSomething = false;
		for(let instruction of json.data.user.result.timeline.timeline.instructions) {
			if(instruction.type == 'TimelineAddEntries') {
				for(let entry of instruction.entries) {
					if(entry.content.entryType == 'TimelineTimelineCursor' && entry.content.cursorType == 'Bottom') {
						cursor = entry.content.value;
					} else if(entry.content.entryType == 'TimelineTimelineItem') {
						hadSomething = true;
						result.push(
							[entry.content.itemContent.user_results.result.rest_id,
							entry.content.itemContent.user_results.result.legacy.screen_name,
							entry.content.itemContent.user_results.result.legacy.profile_image_url_https,
							entry.content.itemContent.user_results.result.legacy.name]
						);
					}
				}
			}
		}
		if(!hadSomething) {
			cursor = 'STOP'
		}
	}
	return result;
}

async function NotifyWebhook(user, caption, colour) {
	let req = await SafeFetch(conf.webhook,
	{
		"headers": {
			"accept": "application/json",
			"accept-language": "en",
			"content-type": "application/json",
		},
		"body": `{"content":"<@${conf.myDiscord}>","embeds":[{"title":"${caption}","color":${colour},"author":{"name":"${user[3]} (@${user[1]})","url":"https://twitter.com/i/user/${user[0]}","icon_url":"${user[2]}"}}],"attachments":[]}`,
		"method": "POST",
	});
	if(req.status == 429) {
		console.log('WEBHOOK RATE LIMITED OOPS???????');
		await DealRateLimit(resp.headers.get('x-ratelimit-reset'));
		return await NotifyWebhook(user, caption, colour);
	}
}

async function CheckUserDifferences(users, oldUsers, newCaption, goneCaption) {
	for(let user of users) {
		//check if there is a new user, that is, an user present in "users" that is not present in "oldUsers"
		let check = oldUsers.find(x => x[0] == user[0]);
		if(!check) {
			console.log(`NEW USER ${user[1]}`);
			await NotifyWebhook(user, newCaption, 0x00ff3d);
		}
	}
	for(let user of oldUsers) {
		//check if there is a user that is gone, that is, an user present in "oldUsers" that is not present in "users"
		let check = users.find(x => x[0] == user[0]);
		if(!check) {
			console.log(`USER ${user[1]} IS GONE`);
			await NotifyWebhook(user, goneCaption, 0xff5d4f);
		}
	}
}

function SaveJson(fname, json) {
	fs.writeFileSync(fname, JSON.stringify(json, null, '\t'));
}

(async() => {
	let latestFollowersFname = `lastFollowers${conf.userId}.json`;
	let latestFollowingFname = `lastFollowing${conf.userId}.json`;
	var followersLast;
	var followingLast;
	//////////////////////////////////////////////////////////////////////////
	if(fs.existsSync(latestFollowersFname)) {
		console.log('Loading latest saved followers');
		followersLast = JSON.parse(fs.readFileSync(latestFollowersFname));
	} else {
		console.log('Getting initial followers list');
		followersLast = await GetUsers(QUERIES.FOLLOWERS);
		SaveJson(latestFollowersFname, followersLast);
	}
	//////////////////////////////////////////////////////////////////////////
	if(fs.existsSync(latestFollowingFname)) {
		console.log('Loading latest saved followings');
		followingLast = JSON.parse(fs.readFileSync(latestFollowingFname));
	} else {
		console.log('Getting initial following list');
		followingLast = await GetUsers(QUERIES.FOLLOWING);
		SaveJson(latestFollowingFname, followingLast);
	}
	//////////////////////////////////////////////////////////////////////////
	console.log('-------------------------');
	for(;;) {
		await Halt(conf.waitMs);
		console.log('Checking, current time is', Date(), Date.now() / 1000);
		console.log('Downloading latest followers list');
		let followersCurrent = await GetUsers(QUERIES.FOLLOWERS);
		console.log('Downloading latest following list');
		let followingCurrent = await GetUsers(QUERIES.FOLLOWING);
		
		console.log('Checking follower differences');
		await CheckUserDifferences(followersCurrent, followersLast, "New follower", "LOST FOLLOWER");
		console.log('Checking following differences');
		await CheckUserDifferences(followingCurrent, followingLast, "Following new user", "UNFOLLOWED USER");
		
		//only save these after checking so that incase of errors nothing is accidentally dismissed
		SaveJson(latestFollowersFname, followersCurrent);
		SaveJson(latestFollowingFname, followingCurrent);
		
		console.log('-------------------------');
		followersLast = followersCurrent;
		followingLast = followingCurrent;
	}
})();