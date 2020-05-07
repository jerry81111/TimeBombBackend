const defaultPic = require('./defaultPic');
const rule = require('./rule');
var cors = require('cors');
var app = require("express")();
var http = require("http").Server(app);
var io = require("socket.io")(http);

app.use(cors());

let info = new Object();
let playerList = new Array();
let chatList = new Array();

function response(code, msg, obj) {
  this.code = code;
  this.msg = msg;
  this.obj = obj;
}

app.get("/", function (req, res) {
  info = new Object();
  playerList = new Array();
  chatList = new Array();
  res.send("<h1>刷刷刷</h1>");
});

let token = 0;
app.get("/getToken", function (req, res) {
  res.send(new response(200, "init", token++));
});

io.on("connection", function (socket) {
  console.log("someone connected !");

  socket.on("queue", (name, token, pic) => {

    //檢查
    let errorMsg = "";
    let names = playerList.map(function (item) {
      return item["name"];
    });
    if (playerList.length >= 8) {
      errorMsg = "人數超過最大上限";
    }
    if (names.includes(name)) {
      errorMsg = "使用者名稱重複";
    }
    if (!name) {
      errorMsg = "使用者名稱未輸入";
    }
    if (errorMsg !== "") {
      io.emit("inProcession", new response(500, "error", errorMsg));
      return;
    } else {
      let player = new Object();
      player.name = name;
      player.token = token;
      if(pic){
        player.photo = pic.toString('base64')
      }else{
        player.photo = defaultPic
      }
      playerList.push(player);
      io.emit("inProcession", new response(200, "queue", playerList));
    }
  });

  socket.on("startGame", () => {
    if (playerList.length > 8 || playerList.length < 4) {
      io.emit("inProcession", new response(500, "error", '人數須符合4~8人'));
      return;
    }
    info.turn = 1;
    info.round = playerList.length;
    info.people = playerList.length;
    info.victory = playerList.length;
    info.result = [];

    playerList = washPlayer(playerList);
    let characters = wahsCharacter();
    let cards = washCard();

    playerList.forEach(function (item, index, array) {
      item.id = index + 1;
      item.character = characters.shift();
      let desk = cards.shift();
      item.cards = desk.map((card) => rule.coverCard);
      info.result.push(desk);
    });

    info.playerList = playerList;

    io.emit("inProcession", new response(200, "startGame", info));
  });

  socket.on("restart", () => {
    info = new Object();
    playerList = new Array();
    chatList = new Array();
    io.emit("inProcession", new response(200, "lock", false));
    io.emit("inProcession", new response(200, "restart", info));
  });

  socket.on("selectCard", (player, card) => {
    let result = info.result[player - 1][card];
    info.playerList[player - 1].cards[card] = result;

    if (result === rule.boomCard) {
      info.end = 0
      io.emit("inProcession", new response(200, "selectCard", info))
      io.emit("inProcession", new response(200, "lock", true));
      return
    }
    if (result === rule.victoryCard) {
      info.victory--
      if (info.vitory === 0 ) { 
        info.end = 1
        io.emit("inProcession", new response(200, "selectCard", info))        
        io.emit("inProcession", new response(200, "lock", true));
        return
      }
    }

    if (info.turn === info.people) {
      io.emit("inProcession", new response(200, "selectCard", info));
      io.emit("inProcession", new response(200, "lock", true));

      info.round--;
      info.turn = 1 ;
      let cards = washCard();

      info.result=[];
      playerList.forEach(function (item) {
        let desk = cards.shift();
        item.cards = desk.map((card) => rule.coverCard);
        info.result.push(desk);
      });
      info.playerList = playerList
      setTimeout(function (){
        io.emit("inProcession", new response(200, "selectCard", info));
        io.emit("inProcession", new response(200, "lock", false));
      }, 1500);
      return 
    }
    info.turn++;
    io.emit("inProcession", new response(200, "selectCard", info));
  });

  socket.on("sendMsg", (msg,token) => {
    let obj = new Object
    obj.msg = msg
    let foundPlayer = playerList.find(player=>player.token===token)
    obj.player = foundPlayer
    chatList.push(obj)
    io.emit("inProcession", new response(200, "sendMsg", chatList));
  });

});

function washPlayer(playerList) {
  let newPlayerList = [];
  const time = playerList.length;
  for (i = 0; i < time; i++) {
    random = Math.floor(Math.random() * playerList.length);
    newPlayerList.push(playerList[random]);
    playerList.splice(random, 1);
  }
  return newPlayerList;
}
function wahsCharacter(){
  let good = 0
  let bad = 0
  let washBefore = [];
  let washAfter = [];

  switch (info.people) {
      case 4:
      case 5:
        good = 3
        bad = 2
      　break;
      case 6:
        good = 4
        bad = 2
      　break;
      case 7:
      case 8:
        good = 5
        bad = 2
      　break;
  }
  for (i = 0; i < bad; i++) {
      washBefore.push(rule.badChar);
  }
  for (i = 0; i < good; i++) {
      washBefore.push(rule.goodChar);
  }
  for (i = 0; i < info.people; i++) {
    random = Math.floor(Math.random() * washBefore.length);
    washAfter.push(washBefore[random]);
    washBefore.splice(random, 1);
  }
 return washAfter
}

function washCard() {
  const total = info.people * info.round;
  let washBefore = [];
  let washAfter = [];

  washBefore.push(rule.boomCard);
  for (i = 0; i < info.victory; i++) {
    washBefore.push(rule.victoryCard);
  }
  for (i = 0; i < total - info.victory - 1; i++) {
    washBefore.push(rule.commonCard);
  }
  let arr = [];
  for (i = 0; i < total; i++) {
    random = Math.floor(Math.random() * washBefore.length);
    arr.push(washBefore[random]);
    washBefore.splice(random, 1);
  }
  for (i = 0; i < info.people; i++) {
    let subArr = [];
    for (j = 0; j < info.round; j++) {
      subArr.push(arr.shift());
    }
    washAfter.push(subArr);
  }
  return washAfter;
}

http.listen(3000, function () {
  console.log("listening on *:3000");
});
