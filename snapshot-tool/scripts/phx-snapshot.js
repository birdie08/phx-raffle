require('dotenv').config();

const fs = require('fs');
const { ethers } = require("ethers");
const phxAbi = require("./phxapi.json");
const { loadPrivateKey } = require('../utils');
const poolAddress = "0xa11ad495c3bf53c19368313a894ba49bc26e7f92";

let starttime = new Date().getTime();

console.log("PHX staker snapshot started");
console.log("ETA for snapshot is about 10 min to 2 hours");

const provider = new ethers.providers.JsonRpcProvider(process.env.RPC_URL);
const signer = new ethers.Wallet(loadPrivateKey(), provider);
//console.log('eSpace signer address: ', signer.address);

const date = new Date();
let yymmdd = date.toLocaleDateString("en-US", {year: "numeric"}) + "-" + date.toLocaleDateString("en-US", {month: "2-digit"}) + "-" + date.toLocaleDateString("en-US", {day: "2-digit"});
let dateLong = date.toLocaleDateString("en-US");
let jstime = date.getTime();

main().catch(console.log);



// FUNCTIONS

async function main() {

  let phx = new ethers.Contract(poolAddress, phxAbi, signer);

  let tx = await phx.stakerNumber();
  let stakerNumber = Number(tx);
  console.log("stakerNumber:", stakerNumber);

  console.log("Starting to fetch staker addresses from blockchain..")

  console.log("staker addresses:");
  //await wait(100);

  let addrs = [];

  for (let i=0; i<=stakerNumber; i++)
  {
    let addr;
    try {
      addr = await phx.stakerAddress(i);
      console.log(addr);
      addrs.push(addr);
    } catch(e)
    {
      console.log("Error returned from phx.stakerAddress("+i+"):", e);
    }
    //await wait(100);

  }

  let wfile = `snapshot.phx.addresses.${yymmdd}.json`;
  writeJsonFile(wfile, addrs);
  console.log(`'${wfile}' file was written`);
  console.log("Staker addresses fetch ended.")

  let ratio = Number(await phx.cfxRatio()) / 1e9;
  console.log("cfx ratio:", ratio);
  
  //let addrs = readJsonFile("snapshot.phx.addresses.json");

  console.log("addresses count:", addrs.length);

 

  console.log("Starting to fetch staking balances from blockchain..")

  let bals = [];

  for (let i=0; i<addrs.length; i++)
  {
    let addr = addrs[i];

    try {
      let _bal = Number(await phx.balanceOf(addr))/1e18 * ratio;
      let bal = parseInt(_bal * 10000) / 10000; // round balance to 4 decimals
      bals.push(bal);
      console.log(addr, bal);
    } catch(e) {
      console.log("Error could not get balance for address:", addr, e);
      bals.push(-1);
    }
  }

  const blockNumber = await provider.getBlockNumber();

 


  wfile = `snapshot.phx.${yymmdd}.json`;
  writeJsonFile(wfile, {"jstime": jstime, "date": dateLong, "block": blockNumber, "addresses": addrs, "balances": bals});
  console.log(`'${wfile}' file was written`);

  console.log("Staker balances fetch ended.")

  /*

  // Raffle moved to frontend 

  let arr = readJsonFile("snapshot.phx.json");

  let addrs = arr[0];
  let bals = arr[1];
  */

  /*
  let oneTicket = 100; // CFX per one ticket

  let result = getRandomWinners(5, oneTicket, addrs, bals); 

  let winners = result.winners;
  let str = result.string;

  writeJsonFile("snapshot.phx.json", {"addresses":addrs, "balances":bals, "result": str, "winners": winners});

  */

  let endtime = new Date().getTime();

  let runtimeMin = (endtime - starttime) / 1000 / 60;
  let runtimeS = parseInt((runtimeMin - parseInt(runtimeMin)) * 60);
  runtimeMin = parseInt(runtimeMin);
  
  console.log(`Snapshot time: ${runtimeMin}min ${runtimeS}s`);
  

  console.log("end");



}


// Moved to Frontend
function getRandomWinners(winnerAmount, cfxPerTicket, addrs, bals)
{
  let str = "";
  let xstr = "";

  let okTicketUserIds = [];

  let etickets = [];
  let addrc = 0;
  let ticketc = [];

  for (let i=0; i<addrs.length; i++)
  {
    let addr = addrs[i];
    let bal = bals[i];
    let _bal = parseInt(bal);
    let tickets = parseInt(_bal/cfxPerTicket);
    ticketc.push(tickets);
    if (tickets >= 1)
    {
       addrc++;
       console.log(addr, ":", bal, ":", tickets);
       for (let j=0; j<tickets; j++)
       {
          etickets.push([i, j+1]);
       }
    }
  }

  xstr = `** PHX monthly raffle **`;
  console.log(xstr);
  str += xstr + "\n";

  xstr = `========================`;
  console.log(xstr);
  str += xstr + "\n";

  xstr = `CFX needed per ticket: ${cfxPerTicket}`;
  console.log(xstr);
  str += xstr + "\n";

  xstr = `Will pick ${winnerAmount} winners total - max 1 win/staker.`;
  console.log(xstr);
  str += xstr + "\n";

  xstr = `Found ${addrc} stakers that are eligible for raffle`;
  console.log(xstr);
  str += xstr + "\n";

  xstr = `Made ${etickets.length} tickets for raffle`;
  console.log(xstr);
  str += xstr + "\n";

  let winners = [];
  let winnerAddresses = [];

  while (winners.length < winnerAmount)
  {
    let winner = getRandomWinner(etickets);
    let found = false;
    for (let k=0; k<winners.length; k++)
    {
      let owinner = winners[k];

      if (owinner === winner)
      {
        found = true;
      }
    }
    if (!found)
    {
      winners.push(winner);
      winnerAddresses.push(addrs[winner]);

      xstr = `We have a raffle winner: ${addrs[winner]} he had ${ticketc[winner]} tickets`;
      console.log(xstr);
      str += xstr + "\n";
    } else
    {
      console.log(`Staker ${addrs[winner]} was already a winner. Re-raffling`);
    }
  }

  return {"string": str, "winners": winnerAddresses};

}

// Moved to Frontend
function getRandomWinner(etickets)
{
  let rand = getRandomInt(etickets.length);

  //console.log("rand:", rand, etickets[rand]);

  let eticket = etickets[rand];

  return eticket[0];
}

function getRandomInt(max)
{
  return Math.floor(Math.random() * max);
}

async function wait(sleepms)
{
  return new Promise(resolve => {
    setTimeout(() => resolve(), sleepms);
  });
}

function writeJsonFile(filepath, data)
{
	try {
		let json = JSON.stringify(data);
		fs.writeFileSync(filepath, json);
		return true;
	} catch(err) {
		console.log("writeJsonFile("+filepath+") failed", err);
		return false;
	}
}

function readJsonFile(filepath)
{
	if (!fileExists(filepath))
	{
		console.log("readJsonFile: file: '" + filepath + "' is missing. Returning empty object.");
		return {};
	}

	let rawdata = fs.readFileSync(filepath, 'utf8');

	return JSON.parse(rawdata);
}

function fileExists(filepath)
{
	return fs.existsSync(filepath);
}

