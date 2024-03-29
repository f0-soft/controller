var ModuleTreeData = {};
var _ = require('underscore');

ModuleTreeData.getGeneralTreeView = function getGeneralTreeView(client, listOfView, callback){
	client.get(strGeneralTreeView(), function (err, reply){
		if ( err ) {
			callback( err );
		} else {
			if ( reply ) {
				var aTreeData = JSON.parse( reply );
				callback( null, checkAndCorrectGeneralTree(listOfView, aTreeData) );
			} else {
				callback( null, newGeneralTree(listOfView));
			}
		}
	});
};

ModuleTreeData.getGeneralTreeFlexo = function getGeneralTreeFlexo(client, listOfFlexo, callback){
	client.get(strGeneralTreeFlexo(), function (err, reply){
		if ( err ) {
			callback( err );
		} else {
			if ( reply ) {
				var aTreeData = JSON.parse( reply );
				callback( null, checkAndCorrectGeneralTree(listOfFlexo, aTreeData) );
			} else {
				callback( null, newGeneralTree(listOfFlexo));
			}
		}
	});
};

function checkAndCorrectGeneralTree(listOfItems, arrTreeData){
	//Клонируем входной объект
	debugger
	var aTreeData = _.clone(arrTreeData);

	//Удаляем отсутствующие view из массива
	var usedView = [];
	for( var i=0; i<aTreeData.length; i++ ){
		//Пропускаем не изменяемые элементы
		if( aTreeData[i].name !== "группы" && aTreeData[i].drag !== false ) {
			if( !(_.indexOf(listOfItems, aTreeData[i].name) + 1) ) {
				aTreeData.splice(i,1);
				i=i-1;
			} else {
				usedView.push(aTreeData[i].name);
			}
		}
	}

	//Определяем view которых нет в схеме
	var notUsedView = _.difference(listOfItems, usedView);

	//Формируем массив используемых идентификаторов
	var aUsedId = [];
	for( var i=0; i<aTreeData.length; i++ ){
		aUsedId.push(aTreeData[i].id);
	}

	//Вставляем несгруппированные названия view
	for(var i=0; i<notUsedView.length; i++){
		var newId;
		for(var j=1;  ;j++){
			if( !( _.indexOf(aUsedId, j) + 1 ) ) {
				newId = j;
				break;
			}
		}

		aTreeData.push({ id:newId, pId:0, name:notUsedView[i], dropRoot:false, dropInner:false});
	}

	return aTreeData;
}

function newGeneralTree(listOfItems){
	//Формируем новый массив данных для дерева
	var aTreeData = [];

	//Вставляем корневой элемент
	aTreeData.push({ id:1, pId:0, name:"группы", open:true, dropInner:false, isParent:true});

	//Вставляем несгруппированные названия view
	var count = 2;
	for(var i=0; i<listOfItems.length; i++, count++){
		aTreeData.push({ id:count, pId:0, name:listOfItems[i], dropRoot:false, dropInner:false});
	}

	return aTreeData;
}


ModuleTreeData.setGeneralTreeView = function setGeneralTreeView(client, oData, callback){
	client.set(strGeneralTreeView(), JSON.stringify(oData), function (err, reply){
		if ( err ) {
			callback( err );
		} else {
			callback( null, true);
		}
	});
};

ModuleTreeData.setGeneralTreeFlexo = function setGeneralTreeFlexo(client, oData, callback){
	client.set(strGeneralTreeFlexo(), JSON.stringify(oData), function (err, reply){
		if ( err ) {
			callback( err );
		} else {
			callback( null, true);
		}
	});
};

//Формирование строки ключа Redis (STRING) для хранения данных дерева view
function strGeneralTreeView( ) {
	return 'generalTree:view:';
}

//Формирование строки ключа Redis (STRING) для хранения данных дерева flexo
function strGeneralTreeFlexo( ) {
	return 'generalTree:flexo:';
}

module.exports = ModuleTreeData;
