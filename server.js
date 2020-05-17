function shuffle(array) {
  for (let i = array.length - 1; i > 0; i--) {
    let j = Math.floor(Math.random() * (i + 1)); // random index from 0 to i
    [array[i], array[j]] = [array[j], array[i]];
  }
}


function checkId(ne, json){
	for (var i=0; i<json.lista.length; i++){
		if (json.lista[i].id == ne)	return true;
	}
	return false;
}

function createMatch(date, time, json){
	var id = 0;
	while (checkId(id, json)){
		id++;
	}
	var newScrim = JSON.parse("{\n\"id\": \""+id+"\",\n\"date\": \""+date+"\",\n\"time\": \""+time+"\",\n\"users\": [],\n\"userIDs\": []\n}"); 
	json.lista.push(newScrim);
	fs.writeFile('./scrims.json', JSON.stringify(json,null,2), () => {});
	return id;
}

function removeMatch(rem, json){
	var data = null;
	var done = false;
	for (var i=0; i<json.lista.length; i++){
		if (json.lista[i].id == rem){
			data = json.lista.splice(i)[0];
		}
	}
	if (data != null)	fs.writeFile('./scrims.json', JSON.stringify(json,null,2), () => {});
	return data;
}

function activateScrim(id, json, bot, channelID){
	var index;
	for (index=0; index<json.lista.length; index++){
		if (json.lista[index].id == id)	break;
	}
	if (index == json.lista.length){
		bot.sendMessage({
					to: channelID,
					message: 'A scrim was programmed for this time, but some error happened and scrim data was lost'
					});
		return;
	}
	mes = "\nGet ready players! Your scrim is about to start!\n\nI've made random teams, I hope you like them:\nTeam 1: ";
	shuffle(json.lista[index].userIDs);
	var team1 = json.lista[index].userIDs.slice(0,json.lista[index].userIDs.length/2);
	var team2 = json.lista[index].userIDs.slice(json.lista[index].userIDs.length/2,json.lista[index].userIDs.length);
	
	for (var i=0; i<team1.length; i++){
		mes += "<@!"+team1[i]+"> "
	}
	mes+="\nTeam 2: ";
	for (var i=0; i<team2.length; i++){
		mes += "<@!"+team2[i]+"> "
	}
	var maps = ["Urban", "Outpost", "Woods", "Meltdown", "Office"];
	shuffle(maps);
	mes+="\n\nI have also chosen the maps for the different rounds you'll be playing, here they go:\n";
	for (var i=0; i<3; i++){
		mes += "Round "+(i+1)+": "+maps[i]+"\t"
	}
	mes+="\n\nGet ready to fight, and show who is the best LaG player. Good Luck!";
	bot.sendMessage({
					to: channelID,
					message: mes
					});
	removeMatch(id,json);
	for (var i=0; i<jobs.length; i++){
		if (jobs[i][0] == id){
			jobs.splice(i);
			break;
		}
	}
	return;
}

require('dotenv').config();
var Discord = require('discord.js');
var scheduler = require('node-schedule');
var fs = require('fs');

var json = require('./scrims.json');
var jobs = []

var bot = new Discord.Client();

bot.login(process.env.TOKEN);

bot.on('ready', function (evt) {
	console.log(bot.user.username+" is up and running");
});


bot.on('message', function (user, userID, channelID, message, evt) {
	console.log(message);
	console.log(evt);
	if (message.substring(0, 7) == '!scrim ') {
		var args = message.substring(7).split(' ');
		var cmd = args[0];
		args = args.splice(1);
		switch(cmd) {
			// Add a new scrim
			case 'new':
				if (args.length != 2){
					bot.sendMessage({
					to: channelID,
					message: 'Improper use of command. To create a new scrim please type\n\t!scrim new <date> <time>\nDate must follow dd/mm/yyyy format\nTime must follow hh:mm in a 24h format, and gets interpreted as local Spanish time\nFor more help type\n\t!scrim help'
					});
				} else {
					var id = createMatch(args[0], args[1], json);
					var fecha = args[0].split('/');
					var hora = args[1].split(':');
					var date = new Date(fecha[2],fecha[1]-1,fecha[0],hora[0],hora[1],0);
					var j = scheduler.scheduleJob(date,function(id,json,bot,channelID){
						activateScrim(id,json,bot,channelID);
						}.bind(null,id,json,bot,channelID));
					jobs.push([id,j]);
					bot.sendMessage({
						to: channelID,
						message: "New scrim created with id  = "+id+"\nScrim is programmed for "+args[0]+" at "+args[1]+" Spanish time (use google to get time at your location)\nRemember currently there are no users signed up for this scrim. To sign yourself up please type:\n\t!scrim addme <scrim\'s id>\n@everyone\nBe fast, or I'll have to join myself and use minigun muahaha!"
						});
				}
			break;
			
			//Remove a scrim
			case 'remove':
				if (args.length != 1){
					bot.sendMessage({
					to: channelID,
					message: 'Improper use of command. To delete a new scrim please type\n\t!scrim remove <scrim\'s id> \nIf you want to see a list of active scrims, please type\n\t!scrim see\nFor more help type\n\t!scrim help'
					});
				} else {
					var data = removeMatch(args[0], json);
					if (data != null){
						for (var i=0; i<jobs.length; i++){
							if (jobs[i][0] == args[0]){
								jobs[i][1].cancel();
								jobs.splice(i);
								break;
							}
						}
						var users = "";
						for (var i=0; i<data.userIDs.length; i++){
							users += "<@!"+data.userIDs[i]+">\n"
						}
						bot.sendMessage({
							to: channelID,
							message: "Scrim with id = "+data.id+" has been succesfully remove.\nI'm sad you aren't going to play it :(\nNotifying signed up members:\n"+users
							});
					} else {
						bot.sendMessage({
							to: channelID,
							message: "Sorry, I was unable to find scrim "+args[0]+". To see the list of currently active scrims please type\n\t!scrim see\nFor more help type\n\t!scrim help"
							});
					}
				}
			break;
			
			//Add a user
			case 'addme':
				if (args.length != 1){
					bot.sendMessage({
					to: channelID,
					message: 'Improper use of command. To add yourself to the scrim please type\n\t!scrim addme <scrim\'s id> \nIf you want to see a list of active scrims, please type\n\t!scrim see\nFor more help type\n\t!scrim help'
					});
				} else {
					var index;
					for (index=0; index<json.lista.length; json++){
						if (json.lista[index].id == args[0])	break;
					}
					if (index < json.lista.length){
						var error = false;
						var users = "";
						for (var i=0; i<json.lista[index].users.length; i++){
							users += "\t"+json.lista[index].users[i]+"\n"
							if (json.lista[index].userIDs[i] == userID)	error = true;
						}
						if (!error){
							var name = evt.d.member.nick;
							if (name == null)	name = user;							
							json.lista[index].users.push(name);
							json.lista[index].userIDs.push(userID);
							fs.writeFile('./scrims.json', JSON.stringify(json,null,2), () => {});
							users+="\t"+name;
							bot.sendMessage({
								to: channelID,
								message: "You have succesfully being added to scrim "+json.lista[index].id+"\nThis is the list of current members for this scrim:\n"+users
								});
						} else {
							bot.sendMessage({
								to: channelID,
								message: "Don't be greedy, you were already on this scrim!"
								});
						}
					} else {
						bot.sendMessage({
							to: channelID,
							message: "Sorry, I was unable to find scrim "+args[0]+". To see the list of currently active scrims please type\n\t!scrim see\nFor more help type\n\t!scrim help"
							});
					}
				}
			break;
			
			
			//Remove a user
			case 'delme':
				if (args.length != 1){
					bot.sendMessage({
					to: channelID,
					message: 'Improper use of command. To remove yourself from the scrim please type\n\t!scrim delme <scrim\'s id> \nIf you want to see a list of active scrims, please type\n\t!scrim see\nFor more help type\n\t!scrim help'
					});
				} else {
					var index;
					for (index=0; index<json.lista.length; json++){
						if (json.lista[index].id == args[0])	break;
					}
					if (index < json.lista.length){
						var value = -1;
						for (var i=0; i<json.lista[index].userIDs.length; i++){
							if (json.lista[index].userIDs[i] == userID){
								value = i;
								break;
							}
						}
						if (value != -1){
							json.lista[index].users.splice(value);
							json.lista[index].userIDs.splice(value);
							fs.writeFile('./scrims.json', JSON.stringify(json,null,2), () => {});
							var users = "";
							for (var i=0; i<json.lista[index].users.length; i++){
								users += "\t"+json.lista[index].users[i]+"\n"
							}
							bot.sendMessage({
								to: channelID,
								message: "You have succesfully being removed from scrim "+json.lista[index].id+"\nThis is the list of current members for this scrim:\n"+users
								});
						} else {
							bot.sendMessage({
								to: channelID,
								message: "Sorry, I couldn't find you on this scrim's member list.\nMaybe I made a mistake?\nImposible! I am a machine."
								});
						}
					} else {
						bot.sendMessage({
							to: channelID,
							message: "Sorry, I was unable to find scrim "+args[0]+". To see the list of currently active scrims please type\n\t!scrim see\nFor more help type\n\t!scrim help'"
							});
					}
				}
			break;
			
			//See scrim list
			case 'see':
				if (args.length != 0){
					bot.sendMessage({
					to: channelID,
					message: 'Improper use of command. To see the active scrim list please type\n\t!scrim see\nFor more help type\n\t!scrim help'
					});
				} else {
					var mes = "This is the list of currently active scrims:\n";
					for (var i=0; i<json.lista.length; i++){
						mes += "\tID: "+json.lista[i].id+"\tDATE: "+json.lista[i].date+"\tTIME: "+json.lista[i].time+"\n"
					}
					mes += "To see which users are participating on each scrim, please type\n\t!scrim users <scrim\'s id>"
					bot.sendMessage({
							to: channelID,
							message: mes
							});
				}
			break;
			
			//See signed up users
			case 'users':
				if (args.length != 1){
					bot.sendMessage({
					to: channelID,
					message: 'Improper use of command. To see the members list for a scrim please type\n\t!scrim users <scrim\'s id>\nFor more help type\n\t!scrim help'
					});
				} else {
					var index;
					for (index=0; index<json.lista.length; json++){
						if (json.lista[index].id == args[0])	break;
					}
					if (index < json.lista.length){
						var mes = "This is the member list for scrim"+args[0]+"\n";
						for (var i=0; i<json.lista[index].users.length; i++){
							mes += "\t"+json.lista[index].users[i]+"\n"
						}
						bot.sendMessage({
							to: channelID,
							message: mes
							});
					} else {
						bot.sendMessage({
							to: channelID,
							message: "Sorry, I was unable to find scrim "+args[0]+". To see the list of currently active scrims please type\n\t!scrim see\nFor more help type\n\t!scrim help'"
							});
					}
				}
			break;
				
			default:
				bot.sendMessage({
							to: channelID,
							message: "This is the list of available commands. Please remember they all must start by !scrim if you want me to be able to read them\n\nnew <date> <time>\tCreates a new scrim. <date> must follow the format dd/mm/yyyy and <time> must be hh:mm 24H format Spanish Local Time\nremove <scrim\'s id>\tDeletes the specified scrim from the database\nsee\tShows a list with all currently active scrims, their ids, datas and times\nusers <scrim\'s id>\tShows which users have signed ut for the specified scrim\naddme <scrim\'s id>\tAdd yourself to the specified scrim\ndelme <scrim\'s id>\t Removes yourself from specified scrim\nhelp\tShows this message"
							});


		}
	}
});
