let mmProvider;
let mmAccount;
let mmSignature;
let mmTextToSign;
let fileData = '';
let strRaffle = '';
let raffleDataArray = [];
let rawFileData;
let filehash;
let raffleStarted = false;
let gWinners;
let gWinnersCount;
let gOneTicket;
let raffleList = [];
let oldRaffleData;
let signatureData = [];

const ownerWallets = [
  '0xFfBD4b43E3b3b74e728f96D1E79C957850fE0CE2',
  '0x0B8E2E8F1e81F153C58E1ff5fa12F9f76F5c6cE9' // test wallet 
];

init();

async function init()
{
  document.getElementById("date").value = getRaffleDate();

  loadRaffleList();
}

async function saveRaffleData(data) 
{
  rawFileData = data;
  filehash = await sha256hash(rawFileData);
}

async function startRaffle() {

  //let arr = readJsonFile("snapshot.phx.json");
  //await loadfile(event);

  if (raffleStarted)
  {
    console.log('Raffle running already')
    alert('Raffle already started');
    return;
  }

  raffleStarted = true;

  if (!rawFileData)
  {
    console.log('snapshot file missing');
    alert('Snapshot file not uploaded');
    raffleStarted = false;
    return;
  }

  oldRaffleData = [];

  mmTextToSign = null;

  let dataObj = JSON.parse(rawFileData);

  if (!dataObj || (dataObj && (!dataObj.addresses || !dataObj.balances || !dataObj.date || !dataObj.block)))
  {
    console.log('snapshot file data error');
    alert('Snapshot file is not in correct format');
    raffleStarted = false;
    return;
  }
 
  signatureData = [];

  let addrs = dataObj.addresses;
  let bals = dataObj.balances;

  let oneTicket = 100; // CFX per one ticket
  let winnersCount = 5; // How many winners

  let el1 = document.getElementById("cfxper");
  let _value = el1.value;
  let _oneT;
  if (!(!_value || _value.length == 0))
  {
    _oneT = parseInt(_value);
    if (_oneT > 0)
    {
      oneTicket = _oneT;
    }
  }
  let el2 = document.getElementById("winners");

  _value = el2.value;
  let _winners;
  if (!(!_value || _value.length == 0))
  {
    _winners = parseInt(_value);
    if (_winners > 0)
    {
      winnersCount = _winners;
    }
  }
  gOneTicket = oneTicket;
  gWinnersCount = winnersCount;
  el1.value = oneTicket;
  el2.value = winnersCount;
  

  document.getElementById("winnersresult").textContent = "🔄 Raffle In Progress...";

  let winners = await getRandomWinners(winnersCount, oneTicket, addrs, bals); 

  gWinners = winners;

  mmTextToSign = strRaffle;

  let el = document.getElementById("winnersresult");
  el.textContent = "";
  //console.log("winners:", winners);
  //console.log("result string:", str);
  let winstr = winners.join("\n");
  //console.log("winstr:", winstr);
  //console.log(el);
  let node = document.createTextNode("Raffle Winners: 🎉🎉\n" + winstr);
  let pre = document.createElement("pre");
  pre.appendChild(node);
  el.appendChild(pre);

  document.getElementById("signRaffle").className = "button bgreen";
  document.getElementById("viewSignature").className = "button hidden";
  document.getElementById("dlsnapshot").className = "button hidden";

  //TODO: Enable sign with wallet button
 
  //writeJsonFile("snapshot.phx.json", {"addresses":addrs, "balances":bals, "result": str, "winners": winners});

  raffleStarted = false;

  console.log("end");
}

async function sha256hash(message) {
  const msgUint8 = new TextEncoder().encode(message);
  const hashBuffer = await window.crypto.subtle.digest("SHA-256", msgUint8);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hash = hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
  return hash;
}

function loadfile(event)
{
  var fileReader = new FileReader();
  fileReader.onload = function()
  {
    fileData = fileReader.result;
    console.log("received data:", fileData);
    //txt.value = fileData;
    //runRaffleWithFile(fileData);
    saveRaffleData(fileData);
  };
  fileReader.readAsText(event.target.files[0]);
}

async function getRandomWinners(winnerAmount, cfxPerTicket, addrs, bals)
{

  let etickets = [];
  let addrc = 0;
  let ticketc = [];

  let unixtime = getUnixTime();
  let jstime = getJstimeFromUnixtime(unixtime);
  let raffleDate = getRaffleDate(jstime);
  document.getElementById("date").value = raffleDate;


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
       console.log("Yes:", addr, ":", bal, ":", tickets);
       for (let j=0; j<tickets; j++)
       {
          etickets.push([i, j+1]);
       }
    } else 
    {
      console.log("No:", addr, ":", bal, ":", tickets);
    }
  }

  let el = document.getElementById("result");
  el.textContent = "";

  strRaffle = '';
  raffleDataArray = [];

  

  await showlog(`▶️ Raffle started at  📅 ${raffleDate}`, "green");
  await showlog(`Snapshot file size: ${rawFileData.length} bytes - sha256 hash: ${filehash}`);
  let ssObj = JSON.parse(rawFileData);
  await showlog(`Snapshot block: ${ssObj.block} Conflux ESpace - date: ${ssObj.date}`);
  await showlog(`Staked CFX needed per ticket: ${cfxPerTicket}`);
  await showlog(`Will pick ${winnerAmount} winners total - max 1 win/staker.`);
  await showlog(`Found ${addrc} stakers that are eligible for raffle of ${addrs.length} total`);
  await showlog(`🎟️ Made ${etickets.length} tickets for raffle`);
 
  let winners = [];
  let winnerAddresses = [];
  let ticketHasWon = [];

  while (winners.length < winnerAmount)
  {
    let ticketUsed = true;
    let winArr, ticketId;
    while (ticketUsed)
    {
      winArr = getRandomWinner(etickets);
      ticketId = winArr[0];
      let usedTicketFound = false;
      for (let t=0; t<ticketHasWon.length; t++)
      {
        if (ticketHasWon[t] == ticketId)
        {
          usedTicketFound = true;
        }
      }
      ticketUsed = usedTicketFound;
    }
    
    let ticketArr = winArr[1];
    let winner = ticketArr[0];
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
      ticketHasWon.push(ticketId);
      winners.push(winner);
      winnerAddresses.push(addrs[winner]);

      await showlog(`🎉 We have a raffle winner: ${addrs[winner]} 🎟️ this staker had ${ticketc[winner]} tickets`, "green");
 
    } else
    {
      
      await showlog(`🔄 Staker ${addrs[winner]} was already a winner. Re-raffling`, "red", false);
    }
  }

  await showlog(`🏁 Raffle finished`, "green");

  return winnerAddresses;

}

function getUnixTime()
{
  return parseInt(Date.now() / 1000);
}

function getJstimeFromUnixtime(date)
{
  return date * 1000;
}

function getRaffleDate(date=null)
{
  if (!date)
  {
    date = new Date();
  }
  let year = new Intl.DateTimeFormat('en', { year: 'numeric' }).format(date);
  let month = new Intl.DateTimeFormat('en', { month: 'short' }).format(date);
  let day = new Intl.DateTimeFormat('en', { day: 'numeric' }).format(date);
  return `${month} ${day} ${year}`;
}

async function fetchdata(url, data) 
{
  const resp = await fetch(url, {
    method: "POST",
    mode: "same-origin",
    cache: "no-cache",
    credentials: "same-origin",
    headers: { "Content-Type": "application/json" },
    redirect: "error",
    referrerPolicy: "same-origin",
    body: JSON.stringify(data),
  });

  return resp.json(); 
};

// list earlier raffles (data with ajax call)

// view 1 earlier raffle as playback (data with ajax call)

// have raffle finalized with signature & save data via ajax call
async function sign() 
{
  if (typeof window.ethereum === 'undefined') 
  {
    console.log("no metamask found");
    alert("Please install metamask first");
    return;
  }
  
  if (ethereum.networkVersion != 1030) 
  {
    console.log(`Wrong network: ${ethereum.networkVersion} - needed 1030`);
    alert('Wrong network. Please switch to Conflux ESpace mainnet.');
    return;
  }

  // const provider = new ethers.providers.Web3Provider(window.ethereum);
  const provider = new ethers.BrowserProvider(window.ethereum);
  const accounts = await provider.send("eth_requestAccounts", []);

  mmProvider = provider;


  if (accounts.length === 0) 
  {
    console.log('RequestAccounts failed');
    alert('Could not get wallet address from wallet');
    return;
  } 

  let isOwner = false;
  for (let i=0; i<ownerWallets.length; i++)
  {
    let _ownerWallet = String(ownerWallets[i]);
    let _thisWallet = String(accounts[0]);
    if (_ownerWallet.toLowerCase() == _thisWallet.toLowerCase())
    {
      isOwner = true;
    }    
  }

  if (!isOwner)
  {
    console.log(`Not owner`);
    alert('You are not allowed to sign the raffle as you are not the owner');
    return;
  }

  mmAccount = accounts[0];

  if (!mmTextToSign || mmTextToSign.length < 20)
  {
    console.log(`Nothing to sign?`);
    alert('Nothing to sign. Please run the raffle first');
    return;
  }

  let signer = await mmProvider.getSigner();
  let signature = await signer.signMessage(mmTextToSign);
  if (!signature || signature.length < 10) {
    console.log(`Signature error`);
    alert('Signature failed. Please try again');
    return;
  }

  let saveData = {
    'req': 'save',
    'snapshot': rawFileData,
    'filehash': filehash,
    'wallet': mmAccount,
    'winners': gWinners,
    'raffleData': raffleDataArray,
    'strRaffle': strRaffle,
    'signature': signature,
    'oneTicket': gOneTicket,
    'winnersCount': gWinnersCount
  };

  console.log("saveData:");
  console.log(saveData);


  let result = await fetchdata("post/?" + Date.now(), saveData);

  console.log("result:");
  console.log(result);

  if (!result || (result && !result.OK))
  {
    console.log("save failed");
    let err = false;
    if (result && result.ERR)
    {
      err = result.ERR;
    }
    err ? alert(err) : alert('Could not save raffle. Please try again');
    return;
  }

  alert(result.OK);

  signatureData = [mmAccount, strRaffle, signature];

  document.getElementById("signRaffle").className = "button bgreen hidden";
  document.getElementById("viewSignature").className = "button";
  document.getElementById("dlsnapshot").className = "button hidden";

  loadRaffleList();

}

async function loadRaffleList()
{
  let data = {
    'req': 'list',
  };
  let result = await fetchdata("post/?" + Date.now(), data);

  if (!result || (result && !result.list))
  {
    console.log("Could not load raffles")
    return;
  }

  if (result.list.length == 0)
  {
    console.log("Could not load raffles")
    return;
  }

  raffleList = result.list;

  el = document.getElementById('raffleselect');

  clearSelectElement(el);

  var opt = document.createElement('option');
  opt.value = -1;
  opt.text = "Select";
  el.options.add(opt);

  for (let i=0; i<result.list.length; i++)
  {
    let id = i;
    let entry = result.list[id];
    
    let name = getRaffleDate(getJstimeFromUnixtime(entry));
    
    var opt = document.createElement('option');
    opt.value = id;
    opt.text = name;
    el.options.add(opt);

   }



}

function clearSelectElement(el) 
{
  while (el.options.length) {
    el.remove(0);
  }
}


async function loadRaffle()
{
  el = document.getElementById('raffleselect');
  let sel = el.options[el.selectedIndex].value;
  if (sel == -1)
  {
    return;
  }

  let raffleId = raffleList[sel];

  if (!raffleId)
  {
    return;
  }

  let data = {
    'req': 'load',
    'id': raffleId,
  };

  let result = await fetchdata("post/?" + Date.now(), data);

  console.log("result:");
  console.log(result);

  if (!result || (result && !result.data))
  {
    console.log("load failed");
    let err = false;
    if (result && result.ERR)
    {
      err = result.ERR;
    }
    err ? alert(err) : alert('Could not load raffle. Please try again');
    return;
  }

  console.log("load success");
  //alert('Raffle load success');
  oldRaffleData = result.data;

  populateRaffle();
}

async function viewSignature()
{
  let el = document.getElementById("modaltxt");

  el.textContent = "";

  let wallet = signatureData[0];
  let signedtxt = signatureData[1];
  let signature = signatureData[2];
  
  let div = document.createElement("div");
  let node = document.createTextNode(`Signing Wallet: ${wallet}`);
  div.appendChild(node);
  el.appendChild(div);

  let div2 = document.createElement("span");
  let node2 = document.createTextNode(`Signed text:`);
  div2.appendChild(node2);
  el.appendChild(div2);

  let pre = document.createElement("pre");
  let node3 = document.createTextNode(signedtxt);
  pre.appendChild(node3);
  el.appendChild(pre);

  let div4 = document.createElement("div");
  let node4 = document.createTextNode(`Signature: ${signature}`);
  div4.appendChild(node4);
  el.appendChild(div4);

  let div5 = document.createElement("div");
  let jsonInline = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify({ "signedMessage": signedtxt, "Signer": wallet, "signature": signature}));
  let anchor = document.createElement("a");
  anchor.innerHTML = '<i class="fa-solid fa-download"></i> Download Signature as JSON';
  anchor.setAttribute("href",jsonInline);
  anchor.setAttribute("download", "signature.json");
  anchor.className = "button";  
  div5.appendChild(anchor);
  el.appendChild(div5);

  openModal();
  
}

async function closeModal()
{
  document.getElementById("modal").className = "show animate__animated animate__fadeOut";
  setTimeout(function() { 
    document.getElementById("modal").className = ""; 
  }, 800);

}

async function openModal()
{
  document.getElementById("modal").className = "show animate__animated animate__fadeIn";
  
  setTimeout(function() { 
    document.getElementById("modal").className = "show"; 
  }, 800);  

}

async function populateRaffle()
{

  document.getElementById("cfxper").value = oldRaffleData.oneTicket;
  document.getElementById("winners").value = oldRaffleData.winnersCount;
  
  document.getElementById("winnersresult").textContent = "🔄 Replaying old raffle...";

  let raffleDate = getRaffleDate(getJstimeFromUnixtime(oldRaffleData.savetime));
  document.getElementById("date").value = raffleDate;

  let node0 = document.createTextNode("🔄 Replay");
  let pre0 = document.createElement("pre");
  pre0.appendChild(node0);
  document.getElementById("result").textContent = "";
  document.getElementById("result").appendChild(pre0);


  for (let i=0; i<oldRaffleData.raffleData.length; i++)
  {
    let arr = oldRaffleData.raffleData[i];
    let txt = arr[0];
    let color = arr[1];
    await showlog(txt, color, false, false);
  }
  
  let el = document.getElementById("winnersresult");
  el.textContent = "";

  let winstr = oldRaffleData.winners.join("\n");
  //console.log("winstr:", winstr);
  //console.log(el);
  let node = document.createTextNode("🔄 Replay: Raffle Winners: 🎉🎉\n" + winstr);
  let pre = document.createElement("pre");
  pre.appendChild(node);
  el.appendChild(pre);

  signatureData = [oldRaffleData.wallet, oldRaffleData.strRaffle, oldRaffleData.signature];
  
  let jsonInline = "data:text/json;charset=utf-8," + encodeURIComponent(oldRaffleData.snapshot);
  let anchor = document.getElementById("dlsnapshot")
  anchor.setAttribute("href",jsonInline);
  anchor.setAttribute("download", "phx-staker-snapshot.json");

  document.getElementById("signRaffle").className = "button bgreen hidden";
  document.getElementById("viewSignature").className = "button";
  document.getElementById("dlsnapshot").className = "button";

}




async function showlog(txt, color="grey", addToRaffleString=true, record=true, waitTimeMs=800)
{
  if (record)
  {
    console.log(txt);
    
    if (addToRaffleString)
    {
      strRaffle += txt + "\n";
    }
    raffleDataArray.push([txt, color]);
  }
  let el = document.getElementById("result");
  var br = document.createElement("br");
  var node = document.createTextNode(txt);
  var span = document.createElement("span");
  span.className = color + " animate__animated animate__fadeIn";
  span.appendChild(node);
  el.appendChild(span);
  el.appendChild(br);
  el.scrollTop = el.scrollHeight;
  if (!record && waitTimeMs == 800)
  {
    waitTimeMs = 500;
  }
  await waitRandom(waitTimeMs);
}

function getRandomWinner(etickets)
{
  let rand = getRandomInt(etickets.length);

  //console.log("rand:", rand, etickets[rand]);

  let eticket = etickets[rand];

  return [rand, eticket];
}

function getRandomInt(max)
{
  return Math.floor(Math.random() * max);
}

async function waitRandom(sleepms)
{
  return new Promise(resolve => {
    let sleepbase = parseInt(sleepms * 0.8);
    let sleepdelta = getRandomInt(parseInt(sleepms * 0.4));
    let sleeptime = sleepbase + sleepdelta;
  
    setTimeout(() => resolve(), sleeptime);
  });
}


