var _ = require( 'underscore' );
var starter = require( 'f0.starter' );
var fs = require( 'fs' );
var async = require( 'async' );

var GenerateDataForFlexo = require('./generateData.js');
var LibOfTestFunction = require('./libOfTestFunction.js');

//Конфиг для стартера
var configStarter = {
	rabbit: require( 'f0.rabbit' ),
	flexo: require( 'f0.flexo' ),
	view: require( 'f0.view' ),
	controller: require('./../../index.js'),

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
		//maxCountIdsInDepend: 10, //Максимальное коллечество id в поле хранящем связь с другой flexo
		uniqDependId: true, //При установки связи, вставляется ещё не использованный id
		сountInsertsInFlexo: 100, //Количество вставок в каждую flexo коллекцию (исп если не указан в countInsert)
		countInsert:{
			/*testView1_1:1,
			testView1_2:1,
			testView1_3:1,
			testView2_1:1,
			testView2_2:1,
			testView2_3:1,
			testView3_1:1,
			testView3_2:1,
			testView3_3:1,
			testView3_4:1,
			testView3_5:1,
			testView4_1:1,
			testView4_2:1,
			testView4_3:1,
			testView4_4:1 */
		},
		maxGenerateNumber:1000000000, //Максимальное генерируемое число, для числовых полей
		maxGenerateString:30 //Максимальная длинна генерируемой строки, для строковых полей
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
//Объект с описанием автора запроса (от кого и от куда запрос) используется при генерации данных
var sender = {
	login: generatorString(1,10),
	role: generatorString(1,10),
	userId: generatorString(1,10),
	place: 'test_productivity'
};

//Формируем словарь вариантов тестов
var libVariantsOfTests = [
	{
		read:[
			{	viewName:'testView1_1', funcExec:LibOfTestFunction.simpleFind, motherView:null,
				findOption:['OneValAnyStrField', 'OneValAnyNumField'/*, 'SomeValAnyNumField'*/],
				flexoName:'testFlexo1_1', funcFormingQuery: LibOfTestFunction.formingSimpleFindQuery
			}, {
				viewName:'testView1_2', funcExec:LibOfTestFunction.simpleFind, motherView:null,
				findOption:['OneValAnyStrField', 'OneValAnyNumField'/*, 'SomeValAnyNumField'*/],
				flexoName:'testFlexo1_2', funcFormingQuery: LibOfTestFunction.formingSimpleFindQuery
			}, {
				viewName:'testView1_3', funcExec:LibOfTestFunction.simpleFind, motherView:null,
				findOption:['OneValAnyStrField', 'OneValAnyNumField'/*, 'SomeValAnyNumField'*/],
				flexoName:'testFlexo1_3', funcFormingQuery: LibOfTestFunction.formingSimpleFindQuery
			}, {
				viewName:'testView1_3To1_2', funcExec:LibOfTestFunction.simpleFind,
				motherView:'testView1_3',
				findOption:['OneValAnyStrField', 'OneValAnyNumField'/*, 'SomeValAnyNumField'*/],
				flexoName:'testFlexo1_3', funcFormingQuery: LibOfTestFunction.formingSimpleFindQuery
			}, {
				viewName:'testView1_3To1_1', funcExec:LibOfTestFunction.simpleFind,
				motherView:'testView1_3',
				findOption:['OneValAnyStrField', 'OneValAnyNumField'/*, 'SomeValAnyNumField'*/],
				flexoName:'testFlexo1_3', funcFormingQuery: LibOfTestFunction.formingSimpleFindQuery
			},
			{
				viewName:'testView1_3And1_2And1_1', funcExec:LibOfTestFunction.simpleFind,
				motherView:'testView1_3',
				findOption:['OneValAnyStrField', 'OneValAnyNumField'/*, 'SomeValAnyNumField'*/],
				flexoName:'testFlexo1_3', funcFormingQuery: LibOfTestFunction.formingSimpleFindQuery
			}
		],
		insert:[
			{
				viewName:'testView1_1', funcExec:LibOfTestFunction.simpleInsert,
				countOfDoc:1, lengthOfString: 30, minNumber:1, maxNumber:100000000,
				funcFormingQuery:LibOfTestFunction.formingSimpleInsertQuery
			},{
				viewName:'testView1_2', funcExec:LibOfTestFunction.simpleInsert,
				motherViewName:'testView1_1', countOfDoc:1, lengthOfString: 30, minNumber:1,
				maxNumber:100000000,
				funcFormingQuery:LibOfTestFunction.formingInsertQueryWithOneDependId
			},{
				viewName:'testView1_3', funcExec:LibOfTestFunction.simpleInsert,
				motherViewName:'testView1_2', countOfDoc:1, lengthOfString: 30, minNumber:1,
				maxNumber:100000000,
				funcFormingQuery:LibOfTestFunction.formingInsertQueryWithOneDependId
			}
		],
		modify:[
			{
				viewName:'testView1_1', funcExec:LibOfTestFunction.simpleModify,
				countOfDoc:1, lengthOfString: 30, minNumber:1, maxNumber:100000000,
				modifyOption:['ModifyOneStrVal', 'ModifyOneNumVal', 'ModifyAllStrVal',
					'ModifyAllNumVal'],
				funcFormingQuery:LibOfTestFunction.formingSimpleModifyQuery
			},{
				viewName:'testView1_2', funcExec:LibOfTestFunction.simpleModify,
				countOfDoc:1, lengthOfString: 30, minNumber:1, maxNumber:100000000,
				modifyOption:['ModifyOneStrVal', 'ModifyOneNumVal', 'ModifyAllStrVal',
					'ModifyAllNumVal', 'ModifyDependId'], motherViewName:'testView1_1',
				funcFormingQuery:LibOfTestFunction.formingSimpleModifyQuery
			},{
				viewName:'testView1_3', funcExec:LibOfTestFunction.simpleModify,
				countOfDoc:1, lengthOfString: 30, minNumber:1, maxNumber:100000000,
				modifyOption:['ModifyOneStrVal', 'ModifyOneNumVal', 'ModifyAllStrVal',
					'ModifyAllNumVal', 'ModifyDependId'], motherViewName:'testView1_2',
				funcFormingQuery:LibOfTestFunction.formingSimpleModifyQuery
			}
		],
		delete:[
			{
				viewName:'testView1_3', funcExec:LibOfTestFunction.simpleDelete, countDoc:1,
				funcFormingQuery:LibOfTestFunction.formingSimpleDeleteQuery
			}
		]
	},{
		read:[
			{	viewName:'testView2_1', funcExec:LibOfTestFunction.simpleFind, motherView:null,
				findOption:['OneValAnyStrField', 'OneValAnyNumField'/*, 'SomeValAnyNumField'*/],
				flexoName:'testFlexo2_1', funcFormingQuery: LibOfTestFunction.formingSimpleFindQuery
			}, {
				viewName:'testView2_2', funcExec:LibOfTestFunction.simpleFind, motherView:null,
				findOption:['OneValAnyStrField', 'OneValAnyNumField'/*, 'SomeValAnyNumField'*/],
				flexoName:'testFlexo2_2', funcFormingQuery: LibOfTestFunction.formingSimpleFindQuery
			}, {
				viewName:'testView2_3', funcExec:LibOfTestFunction.simpleFind, motherView:null,
				findOption:['OneValAnyStrField', 'OneValAnyNumField'/*, 'SomeValAnyNumField'*/],
				flexoName:'testFlexo2_3', funcFormingQuery: LibOfTestFunction.formingSimpleFindQuery
			}, {
				viewName:'testView2_3To2_1', funcExec:LibOfTestFunction.simpleFind,
				motherView:'testView2_3',
				findOption:['OneValAnyStrField', 'OneValAnyNumField'/*, 'SomeValAnyNumField'*/],
				flexoName:'testFlexo2_3', funcFormingQuery: LibOfTestFunction.formingSimpleFindQuery
			}, {
				viewName:'testView2_3To2_2', funcExec:LibOfTestFunction.simpleFind,
				motherView:'testView2_3',
				findOption:['OneValAnyStrField', 'OneValAnyNumField'/*, 'SomeValAnyNumField'*/],
				flexoName:'testFlexo2_3', funcFormingQuery: LibOfTestFunction.formingSimpleFindQuery
			},{
				viewName:'testView2_3And2_2And2_1', funcExec:LibOfTestFunction.simpleFind,
				motherView:'testView2_3',
				findOption:['OneValAnyStrField', 'OneValAnyNumField'/*, 'SomeValAnyNumField'*/],
				flexoName:'testFlexo2_3', funcFormingQuery: LibOfTestFunction.formingSimpleFindQuery
			}
		],
		insert:[
			{
				viewName:'testView2_1', funcExec:LibOfTestFunction.simpleInsert,
				countOfDoc:1, lengthOfString: 30, minNumber:1, maxNumber:100000000,
				funcFormingQuery:LibOfTestFunction.formingSimpleInsertQuery
			},{
				viewName:'testView2_2', funcExec:LibOfTestFunction.simpleInsert,
				countOfDoc:1, lengthOfString: 30, minNumber:1, maxNumber:100000000,
				funcFormingQuery:LibOfTestFunction.formingSimpleInsertQuery
			},{
				viewName:'testView2_3', funcExec:LibOfTestFunction.simpleInsert,
				motherViewName:['testView2_1', 'testView2_2'],
				countOfDoc:1, lengthOfString: 30, minNumber:1,	maxNumber:100000000,
				funcFormingQuery:LibOfTestFunction.formingSpecialInsertQueryVariant1
			}
		],
		modify:[
			{
				viewName:'testView2_1', funcExec:LibOfTestFunction.simpleModify,
				countOfDoc:1, lengthOfString: 30, minNumber:1, maxNumber:100000000,
				modifyOption:['ModifyOneStrVal', 'ModifyOneNumVal', 'ModifyAllStrVal',
					'ModifyAllNumVal'],
				funcFormingQuery:LibOfTestFunction.formingSimpleModifyQuery
			},{
				viewName:'testView2_2', funcExec:LibOfTestFunction.simpleModify,
				countOfDoc:1, lengthOfString: 30, minNumber:1, maxNumber:100000000,
				modifyOption:['ModifyOneStrVal', 'ModifyOneNumVal', 'ModifyAllStrVal',
					'ModifyAllNumVal'], motherViewName:'testView1_1',
				funcFormingQuery:LibOfTestFunction.formingSimpleModifyQuery
			},{
				viewName:'testView2_3', funcExec:LibOfTestFunction.simpleModify,
				countOfDoc:1, lengthOfString: 30, minNumber:1, maxNumber:100000000,
				modifyOption:['ModifyOneStrVal', 'ModifyOneNumVal', 'ModifyAllStrVal',
					'ModifyAllNumVal', 'ModifyDependId'],
				motherViewName:['testView2_1', 'testView2_2'],
				funcFormingQuery:LibOfTestFunction.formingSpecialModifyQueryVariant1
			}
		],
		delete:[
			{
				viewName:'testView2_3', funcExec:LibOfTestFunction.simpleDelete, countDoc:1,
				funcFormingQuery:LibOfTestFunction.formingSimpleDeleteQuery
			}
		]
	},{
		read:[
			{	viewName:'testView3_1', funcExec:LibOfTestFunction.simpleFind, motherView:null,
				findOption:['OneValAnyStrField', 'OneValAnyNumField'/*, 'SomeValAnyNumField'*/],
				flexoName:'testFlexo3_1', funcFormingQuery: LibOfTestFunction.formingSimpleFindQuery
			}, {
				viewName:'testView3_2', funcExec:LibOfTestFunction.simpleFind, motherView:null,
				findOption:['OneValAnyStrField', 'OneValAnyNumField'/*, 'SomeValAnyNumField'*/],
				flexoName:'testFlexo3_2', funcFormingQuery: LibOfTestFunction.formingSimpleFindQuery
			}, {
				viewName:'testView3_3', funcExec:LibOfTestFunction.simpleFind, motherView:null,
				findOption:['OneValAnyStrField', 'OneValAnyNumField'/*, 'SomeValAnyNumField'*/],
				flexoName:'testFlexo3_3', funcFormingQuery: LibOfTestFunction.formingSimpleFindQuery
			}, {
				viewName:'testView3_4', funcExec:LibOfTestFunction.simpleFind, motherView:null,
				findOption:['OneValAnyStrField', 'OneValAnyNumField'/*, 'SomeValAnyNumField'*/],
				flexoName:'testFlexo3_4', funcFormingQuery: LibOfTestFunction.formingSimpleFindQuery
			}, {
				viewName:'testView3_5', funcExec:LibOfTestFunction.simpleFind, motherView:null,
				findOption:['OneValAnyStrField', 'OneValAnyNumField'/*, 'SomeValAnyNumField'*/],
				flexoName:'testFlexo3_5', funcFormingQuery: LibOfTestFunction.formingSimpleFindQuery
			}, {
				viewName:'testView3_5To3_4', funcExec:LibOfTestFunction.simpleFind,
				motherView:'testView3_5',
				findOption:['OneValAnyStrField', 'OneValAnyNumField'/*, 'SomeValAnyNumField'*/],
				flexoName:'testFlexo3_5', funcFormingQuery: LibOfTestFunction.formingSimpleFindQuery
			}, {
				viewName:'testView3_5To3_3', funcExec:LibOfTestFunction.simpleFind,
				motherView:'testView3_5',
				findOption:['OneValAnyStrField', 'OneValAnyNumField'/*, 'SomeValAnyNumField'*/],
				flexoName:'testFlexo3_5', funcFormingQuery: LibOfTestFunction.formingSimpleFindQuery
			},{
				viewName:'testView3_5To3_2', funcExec:LibOfTestFunction.simpleFind,
				motherView:'testView3_5',
				findOption:['OneValAnyStrField', 'OneValAnyNumField'/*, 'SomeValAnyNumField'*/],
				flexoName:'testFlexo3_5', funcFormingQuery: LibOfTestFunction.formingSimpleFindQuery
			},{
				viewName:'testView3_5To3_1', funcExec:LibOfTestFunction.simpleFind,
				motherView:'testView3_5',
				findOption:['OneValAnyStrField', 'OneValAnyNumField'/*, 'SomeValAnyNumField'*/],
				flexoName:'testFlexo3_5', funcFormingQuery: LibOfTestFunction.formingSimpleFindQuery
			},{
				viewName:'testView3_5And3_4And3_3', funcExec:LibOfTestFunction.simpleFind,
				motherView:'testView3_3',
				findOption:['OneValAnyStrField', 'OneValAnyNumField'/*, 'SomeValAnyNumField'*/],
				flexoName:'testFlexo3_5', funcFormingQuery: LibOfTestFunction.formingSimpleFindQuery
			},{
				viewName:'testView3_5And3_4And3_3And3_2', funcExec:LibOfTestFunction.simpleFind,
				motherView:'testView3_5',
				findOption:['OneValAnyStrField', 'OneValAnyNumField'/*, 'SomeValAnyNumField'*/],
				flexoName:'testFlexo3_5', funcFormingQuery: LibOfTestFunction.formingSimpleFindQuery
			},{
				viewName:'testView3_5And3_4And3_3And3_2And3_1', funcExec:LibOfTestFunction.simpleFind,
				motherView:'testView3_3',
				findOption:['OneValAnyStrField', 'OneValAnyNumField'/*, 'SomeValAnyNumField'*/],
				flexoName:'testFlexo3_5', funcFormingQuery: LibOfTestFunction.formingSimpleFindQuery
			}
		],
		insert:[
			{
				viewName:'testView3_1', funcExec:LibOfTestFunction.simpleInsert,
				countOfDoc:1, lengthOfString: 30, minNumber:1, maxNumber:100000000,
				funcFormingQuery:LibOfTestFunction.formingSimpleInsertQuery
			},{
				viewName:'testView3_2', funcExec:LibOfTestFunction.simpleInsert,
				motherViewName:'testView3_1', countOfDoc:1, lengthOfString: 30, minNumber:1,
				maxNumber:100000000,
				funcFormingQuery:LibOfTestFunction.formingInsertQueryWithOneDependId
			},{
				viewName:'testView3_3', funcExec:LibOfTestFunction.simpleInsert,
				motherViewName:'testView3_2', countOfDoc:1, lengthOfString: 30, minNumber:1,
				maxNumber:100000000,
				funcFormingQuery:LibOfTestFunction.formingInsertQueryWithOneDependId
			},{
				viewName:'testView3_4', funcExec:LibOfTestFunction.simpleInsert,
				motherViewName:'testView3_3', countOfDoc:1, lengthOfString: 30, minNumber:1,
				maxNumber:100000000,
				funcFormingQuery:LibOfTestFunction.formingInsertQueryWithOneDependId
			},{
				viewName:'testView3_5', funcExec:LibOfTestFunction.simpleInsert,
				motherViewName:'testView3_4', countOfDoc:1, lengthOfString: 30, minNumber:1,
				maxNumber:100000000,
				funcFormingQuery:LibOfTestFunction.formingInsertQueryWithOneDependId
			}
		],
		modify:[
			{
				viewName:'testView3_1', funcExec:LibOfTestFunction.simpleModify,
				countOfDoc:1, lengthOfString: 30, minNumber:1, maxNumber:100000000,
				modifyOption:['ModifyOneStrVal', 'ModifyOneNumVal', 'ModifyAllStrVal',
					'ModifyAllNumVal'],
				funcFormingQuery:LibOfTestFunction.formingSimpleModifyQuery
			},{
				viewName:'testView3_2', funcExec:LibOfTestFunction.simpleModify,
				countOfDoc:1, lengthOfString: 30, minNumber:1, maxNumber:100000000,
				modifyOption:['ModifyOneStrVal', 'ModifyOneNumVal', 'ModifyAllStrVal',
					'ModifyAllNumVal', 'ModifyDependId'], motherViewName:'testView3_1',
				funcFormingQuery:LibOfTestFunction.formingSimpleModifyQuery
			},{
				viewName:'testView3_3', funcExec:LibOfTestFunction.simpleModify,
				countOfDoc:1, lengthOfString: 30, minNumber:1, maxNumber:100000000,
				modifyOption:['ModifyOneStrVal', 'ModifyOneNumVal', 'ModifyAllStrVal',
					'ModifyAllNumVal', 'ModifyDependId'], motherViewName:'testView3_2',
				funcFormingQuery:LibOfTestFunction.formingSimpleModifyQuery
			},{
				viewName:'testView3_4', funcExec:LibOfTestFunction.simpleModify,
				countOfDoc:1, lengthOfString: 30, minNumber:1, maxNumber:100000000,
				modifyOption:['ModifyOneStrVal', 'ModifyOneNumVal', 'ModifyAllStrVal',
					'ModifyAllNumVal', 'ModifyDependId'], motherViewName:'testView3_3',
				funcFormingQuery:LibOfTestFunction.formingSimpleModifyQuery
			},{
				viewName:'testView3_5', funcExec:LibOfTestFunction.simpleModify,
				countOfDoc:1, lengthOfString: 30, minNumber:1, maxNumber:100000000,
				modifyOption:['ModifyOneStrVal', 'ModifyOneNumVal', 'ModifyAllStrVal',
					'ModifyAllNumVal', 'ModifyDependId'], motherViewName:'testView3_4',
				funcFormingQuery:LibOfTestFunction.formingSimpleModifyQuery
			}
		],
		delete:[
			{
				viewName:'testView3_5', funcExec:LibOfTestFunction.simpleDelete, countDoc:1,
				funcFormingQuery:LibOfTestFunction.formingSimpleDeleteQuery
			}
		]
	}
];

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
	GenerateDataForFlexo.init(controller, sender, libOfViews, _views, _flexos, configTest);
	LibOfTestFunction.init(controller, libOfViews, _views, _flexos);
	async.waterfall([
			//Вставляем разрешения для всех flexo схем
			GenerateDataForFlexo.saveFlexoAccessForRole,
			//Вставляем разрешения для всех view схем
			GenerateDataForFlexo.saveViewAccessForRole,
			//Вставляем данные во flexo testFlexo1_1
			function ( arg, cb ){
				GenerateDataForFlexo.simpleFillingTestFlexos( 'testView1_1', cb );
			},
			//Вставляем данные во flexo testFlexo1_2
			function ( cb ){
				GenerateDataForFlexo.fillTestFlexosWithOneOfId( 'testView1_2', 'testView1_1', cb );
			},
			//Вставляем данные во flexp testFlexo1_3
			function ( cb ){
				GenerateDataForFlexo.fillTestFlexosWithOneOfId( 'testView1_3', 'testView1_2', cb );
			},
			//Вставляем данные во flexp testFlexo2_1
			function ( cb ){
				GenerateDataForFlexo.simpleFillingTestFlexos( 'testView2_1', cb );
			},
			//Вставляем данные во flexp testFlexo2_2
			function ( cb ){
				GenerateDataForFlexo.simpleFillingTestFlexos( 'testView2_2', cb );
			},
			//Вставляем данные во flexp testFlexo2_3
			GenerateDataForFlexo.fillTestFlexos2_3,
			//Вставляем данные во flexp testFlexo3_1
			function ( cb ){
				GenerateDataForFlexo.simpleFillingTestFlexos( 'testView3_1', cb );
			},
			//Вставляем данные во flexp testFlexo3_2
			function ( cb ){
				GenerateDataForFlexo.fillTestFlexosWithOneOfId( 'testView3_2', 'testView3_1', cb );
			},
			//Вставляем данные во flexp testFlexo3_3
			function ( cb ){
				GenerateDataForFlexo.fillTestFlexosWithOneOfId( 'testView3_3', 'testView3_2', cb );
			},
			//Вставляем данные во flexp testFlexo3_4
			function ( cb ){
				GenerateDataForFlexo.fillTestFlexosWithOneOfId( 'testView3_4', 'testView3_3', cb );
			},
			//Вставляем данные во flexp testFlexo3_5
			function ( cb ){
				GenerateDataForFlexo.fillTestFlexosWithOneOfId( 'testView3_5', 'testView3_4', cb );
			},
			//Вставляем данные во flexp testFlexo4_1
			function ( cb ){
				GenerateDataForFlexo.simpleFillingTestFlexos( 'testView4_1', cb );
			},
			//Вставляем данные во flexp testFlexo4_2
			function ( cb ){
				GenerateDataForFlexo.simpleFillingTestFlexos( 'testView4_2', cb );
			},
			//Вставляем данные во flexp testFlexo4_3
			GenerateDataForFlexo.fillTestFlexos4_3,
			//Вставляем данные во flexp testFlexo4_4
			GenerateDataForFlexo.fillTestFlexos4_4
		],
		function (err, reply) {
			if ( err ) {
				console.log( err.message );
			} else {
				console.log('✓ - Генерация завершена');
				temporarily();
			}
		}
	);
}

function temporarily(){
	/*//Чтение
	var variantOfRead = libVariantsOfTests[2].read[3];
	var viewName = variantOfRead.viewName;
	var motherView = variantOfRead.motherView;
	var query = variantOfRead.funcFormingQuery(viewName, motherView, variantOfRead.flexoName,
		variantOfRead.findOption[0]);

	if ( query ) {
		variantOfRead.funcExec(viewName, query, sender, function( err, documents, count ){
			console.log(err);
			console.log(documents);
			console.log(count);
		});
	} else {
		console.log('x - Неудалось сформировать запрос для ' + viewName);
	}*/

	/*//Вставка
	var variantIsert = libVariantsOfTests[1].insert[3];
	var viewName = variantIsert.viewName;
	var motherViewName = variantIsert.motherViewName;
	var countOfDoc = variantIsert.countOfDoc;
	var lengthOfString = variantIsert.lengthOfString;
	var minNumber = variantIsert.minNumber;
	var maxNumber = variantIsert.maxNumber;
	var query = variantIsert.funcFormingQuery(viewName, countOfDoc,	lengthOfString, minNumber, maxNumber, motherViewName);

	if ( query ) {
		variantIsert.funcExec(viewName, query, sender, function( err, documents, count ){
			console.log(err);
			console.log(documents);
			console.log(count);
		});
	} else {
		console.log('x - Неудалось сформировать запрос для ' + viewName);
	}*/

	//Модификация
	/*var variantModify = libVariantsOfTests[1].modify[2];
	var viewName = variantModify.viewName;
	var motherViewName = variantModify.motherViewName;
	var countOfDoc = variantModify.countOfDoc;
	var lengthOfString = variantModify.lengthOfString;
	var minNumber = variantModify.minNumber;
	var maxNumber = variantModify.maxNumber;
	var modifyOption = variantModify.modifyOption[4];
	var query = variantModify.funcFormingQuery(viewName, modifyOption, countOfDoc, lengthOfString,
		minNumber, maxNumber, motherViewName);

	if ( query ) {
		variantModify.funcExec(viewName, query, sender, function( err, documents, count ){
			console.log(err);
			console.log(documents);
			console.log(count);
		});
	} else {
		console.log('x - Неудалось сформировать запрос для ' + viewName);
	}*/

	/*//Удаление
	var variantDelete = libVariantsOfTests[1].delete[0];
	var viewName = variantDelete.viewName;
	var countDoc = variantDelete.countDoc;
	var query = variantDelete.funcFormingQuery(viewName, countDoc);

	if ( query ) {
		variantDelete.funcExec(viewName, query, sender, function( err, documents, count ){
			console.log(err);
			console.log(documents);
			console.log(count);
		});
	} else {
		console.log('x - Неудалось сформировать запрос для ' + viewName);
	} */

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