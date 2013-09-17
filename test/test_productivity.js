var _ = require( 'underscore' );
var starter = require( 'f0.starter' );
var fs = require( 'fs' );
var async = require( 'async' );

//Конфиг для стартера
var configStarter = {
	rabbit: require( 'f0.rabbit' ),
	flexo: require( 'f0.flexo' ),
	view: require( 'f0.view' ),
	controller: require('./../index.js'),

	flexo_path: __dirname + '/scheme/flexoForTestProductivity',
	link_path: __dirname + '/scheme/linksForTestProductivity',
	view_path: __dirname + '/scheme/viewForTestProductivity',
	template_path: __dirname + '/scheme/viewForTestProductivity',
	template_timeout: 100,
	controller_role_to_company_view: {},

	redis: {
		host: '127.0.0.1',
		port: 6379
	},

	rabbit_hint: {},
	rabbit_hint_score: {}
};

//Настройки теста
var configTest = {
	generateData:true, //Требуется ли генерация данных
	optionsForGenerateData:{
		maxCountIdsInDepend: 10, //Максимальное коллечество id в поле хранящем связь с другой flexo
		сountInsertsInFlexo: 10000 //Количество вставок в каждую flexo коллекцию
	}
};

//Переменная для хранения ссылки на контроллер
var controller;
//Переменная для хранения словаря с генерированными данными для запросов к view
var libOfViews = {};

//Словарь используемый для генерации строк
var charString = ['й','ц','у','к','е','н','г','ш','щ',
	'з','з','х','ъ','ф','ы','в','а','п','р','о','л',
	'д','ж','э','я','ч','с','м','и','т','ь','б','ю','Й',
	'Ц','У','К','Е','Н','Г','Ш','Щ','З','Х',
	'Ъ','Ф','Ы','В','А','П','Р','О','Л','Д','Ж','Э',
	'Я','Ч','С','М','И','Т','Ь','Б','Ю','q',
	'w','e','r','t','y','u','i','o','p','a','s','d','f',
	'g','h','j','k','l','z','x','c','v','b','n','m',
	'1','2','3','4','5','6','7','8','9','0','Q',
	'W','E','R','T','Y','U','I','O','P','A','S','D','F',
	'G','H','J','K','L','Z','X','C','V','B','N','M'];

//Переменная для хранения данных об авторе запросов
//Объект с описанием автора запроса (от кого и от куда запрос)
var sender = {
	login: generatorString(1,10),
	role: generatorString(1,10),
	userId: generatorString(1,10),
	place: 'test_productivity'
};

//Подключаем описание flexo и view
var _flexos = {}; //Описания из flexo схем
var filesFlexo = fs.readdirSync( configStarter.flexo_path );
for ( i = 0; i < filesFlexo.length; i += 1 ) {
	_flexos[filesFlexo[i].split('.')[0]] = require( configStarter.flexo_path + '/' + filesFlexo[i]).root;
}
var _views = {}; //Описание из view схем
var filesViews = fs.readdirSync( configStarter.view_path );
for ( i = 0; i < filesViews.length; i += 1 ) {
	_views[filesViews[i].split('.')[0]] = require( configStarter.view_path + '/' + filesViews[i]).config;
}

//Запуск стартера
starter.init( configStarter, function( err, module ) {
	if ( err ) { console.log( err.message ); }
	else { controller = module; }

	if ( configTest.generateData ) {
		generateData();
	}
} );

//Функция генерации данных
function generateData(){
	async.waterfall([
			//Вставляем разрешения для всех flexo схем
			saveFlexoAccessForRole,
			//Вставляем разрешения для всех view схем
			saveViewAccessForRole,
			//Вставляем данные во flex-ы testFlexo1
			fillTestFlexos1
		],
		function (err, reply) {
			if ( err ) {
				console.log( err );
			} else {
				console.log('✓ - Генерация завершена');
			}
		}
	);
}

function saveFlexoAccessForRole( callback ) {
	//Вставляем разрешения для всех схем
	var listOfFlexoScheme = Object.keys( _flexos );
	//Объект прав для flexo по роли (все разрешено)
	var objAccessForRole = {
		read: { '(all)':1, 'fields':[] },
		modify: { '(all)':1, 'fields':[] },
		create: { '(all)':1, 'fields':[] },
		createAll: 1,
		delete: 1
	};

	async.map(listOfFlexoScheme,
		function( flexoSchemeName, cb ){
			//Формируем запрос на сохранение прав
			var queryForSave = {
				access:{
					flexoSchemeName: flexoSchemeName,
					role:sender.role,
					objAccess: objAccessForRole
				}
			};
			controller.create(queryForSave, sender, cb);
		},
		callback
	);
}

function saveViewAccessForRole( arg, callback ) {
	//Вставляем разрешения для всех схем
	var listOfViewScheme = Object.keys( _views );
	//Объект прав для view по роли (все разрешено)
	var objAccessForRole = {
		'(all)':1,
		'viewIds':[],
		'(useId)':0
	};

	async.map([listOfViewScheme[0]],
		function( viewSchemeName, cb ){
			//Формируем запрос на сохранение прав
			var queryForSave = {
				access:{
					viewName: viewSchemeName,
					role:sender.role,
					objAccess: objAccessForRole
				}
			};
			controller.create(queryForSave, sender, cb);
		},
		callback
	);
}

function fillTestFlexos1( arg, callback ) {
	//libOfViews

	var viewName = 'testView1_1';
	libOfViews[viewName] = [];
	var socket = {};

	controller.getTemplate( viewName, sender, socket, function( err, config, template ) {
		if ( err ) {
			callback( err );
		} else {
			//Формируем запрос на множественную вставку
			var queryToCreate = [];
			var query; //Один документ на вставку
			var listOfVids = getListOfVids(viewName, 'create');
			for( var i = 0; i < configTest.optionsForGenerateData.сountInsertsInFlexo; i++ ) {
				query = {};
				for( var j = 0; j < listOfVids.length; j++ ) {
					var flexoShemeName = _views[viewName][listOfVids[j]]._flexo.scheme[0];
					var flexoFieldName = _views[viewName][listOfVids[j]]._flexo.scheme[1];

					var type = _flexos[flexoShemeName][flexoFieldName].type;

					if ( type === 'string' ) {
						query[listOfVids[j]] = generatorString(1, 30);
					} else if ( type === 'number' ) {
						query[listOfVids[j]] = getRandom(1, 1000000000);
					}
				}
				queryToCreate.push(query);

				//Сохраняем данные в словарь
				libOfViews[viewName].push(query);
			}

			//Сохраняем данные
			var dateStart = new Date().getTime();
			controller.queryToView ( 'create', sender, queryToCreate, viewName, socket,
				function(err, documents ){
					if( err ) {
						callback( err )
					} else {
						console.log('✓ - Вставка ' +
							configTest.optionsForGenerateData.сountInsertsInFlexo +
							' сгенерированных данных для testFlexo1_1: ' +
							( new Date().getTime() - dateStart ) + ' ms.');
						//Сохраняем _id и tsUpdate в словарик
						for( var i = 0; i < documents.length ; i++ ){
							libOfViews[viewName][i]['tV01'] = documents[i]['tV01'];
							libOfViews[viewName][i]['tV01'] = documents[i]['tV02'];
						}

						callback( );
					}
				});
		}
	});
}

function getListOfVids( viewName, type ) {
	var listOfVids = Object.keys( _views[viewName] );
	var filtredList = [];

	for( var i = 0; i < listOfVids.length; i++ ){
		if ( _views[viewName][listOfVids[i]]._flexo.type === type ) {
			filtredList.push(listOfVids[i]);
		}
	}

	return filtredList;
}


//Создаем случайное число в заданных пределах
function getRandom(min, max) {
	return Math.floor(Math.random() * (max - min + 1) + min);
}

//Генерирует строку
function generatorString (z , g) {
	var stringLength = getRandom(z,g);
	var str = '';
	for(var i = 0; i < stringLength; i++){
		str = str + charString[getRandom(0,charString.length-1)];
	}

	return str;
}