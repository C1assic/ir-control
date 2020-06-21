const SerialPort = require('serialport') //библиотека для работы с сериал портом
const Readline = require('@serialport/parser-readline')
const robot = require("robotjs"); //библиотека для эмуляции пользовательский событий
const activeWin = require('active-win'); //библиотека для получения активного окна

const config = require('./config'); //подключаем конфишурационный файл

class AutoSerial {
    constructor(path, config) {
        this.path = path;
        this.config = config || {};
        this.config.autoOpen = false;
        this.connected = false;
        this.serialPort = new SerialPort(this.path, this.config); //инициализируем экземпляр сериал порт
        this.parser = this.serialPort.pipe(new Readline({ delimiter: '\n' })); //инициализируем парсер новой строки

        /* событие открытия порта */
        this.serialPort.on('open', () => {
            console.error('serial opened');
            this.connected = true;
        });

        /* событие закрытие порта */
        this.serialPort.on('close', () => {
            this.connected = false;
            console.error('serial close');
            setTimeout(this.reconnect.bind(this), 5000);
        });

        /* событие возникновения ошибки */
        this.serialPort.on('error', (err) => {
            console.error('serial error: ', err);
            setTimeout(this.reconnect.bind(this), 5000);
        });

        /* открываем порт */
        this.serialPort.open();
    }

    /* функция переподключения */
    reconnect() {
        if (!this.connected) { 
            this.serialPort.open(); 
        }
    }
}

const serial = new AutoSerial(config.path);

/* событие новой строки содержащей код клавиши пульта */
serial.parser.on('data', async function(line) {
    const currentWin = await activeWin(); //информация о активном окне
    const keyCode = parseInt(line, 16); //парсинг шеснацатиричного числа

    if(keyCode === 4294967295){ // если отправлен код ошибки
        return;
    }

    /* ищем конфиг для текущего окна */
    let currentWinConfig = config.wins.find(win => {
        return win.name.toLowerCase() === currentWin.owner.name.toLowerCase();
    });
    let currentKey;
    if(currentWinConfig){ //если найден конфиг для текущего окна
        /* ищем информацию о клавище в конфиге текущего окна */
        currentKey = currentWinConfig.keys.find(key => {
            return key.code == keyCode;
        });
    }

    if(!currentKey){ //если нет информации о текущей клавище
        /* ищем информацию о клавище в дефолтном конфиге */
        currentKey = config.defaultKeys.find(key => {
            return key.code == keyCode;
        });
    }
    
    if(currentKey){ //если найдена информация о клавище
        robot.keyTap(currentKey.key); //эмулируем нажатие клавиши
    }

    console.log('-------------------------------------------');
    console.log('Windows name: ', currentWin.owner.name); 
    console.log('Key code: ', keyCode);
    if(currentKey){
        console.log('Key emulate: ', currentKey.key);
    }
    console.log('-------------------------------------------');
});