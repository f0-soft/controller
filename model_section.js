var underscore = require('underscore');
var async = require('async');

module.exports = ModelSection;

/**
 * Конструктор модели раздела
 *
 * @constructor
 * @param client - объект redis клиент
 * @param [login] - строка, login пользователя
 * @param [role] - строка, роль пользователя
 */
function ModelSection( client, login, role ) {
	this.client = client;
	this.login = login;
	this.role = role;
	return this;
}

/**
 * Сохранение общих данных о разделе или о его правах по пользователю или по роли
 *
 * @param type - строка, тип запроса
 * @param sectionName - строка, название раздела
 * @param objForRedis - объект для сохранения в Redis
 * @param callback
 */
ModelSection.prototype.create = function create( type, sectionName, objForRedis, callback ){
	//ToDo: продумать валидацию объекта с описанием раздела

	var multi = this.client.multi();

	if( type === 'section' ){
		//Сохраняем общие данные о разделе
		multi.SET( strSectionHash( sectionName ), JSON.stringify( objForRedis ) );

		multi.SET( strSectionToTitle( sectionName ), objForRedis.title );

		//ToDo:временно для удаления всех ключей из Redis связанных c контроллером
		multi.SADD( setAllAccess(), strSectionHash( sectionName ) );

		multi.EXEC( function( err ) {
			if ( err ){
				callback( err );
			} else {
				callback( null, true );
			}
		} );
	} else if ( type === 'userSection' ) {
		//сохраняем данные о правах по пользователю для раздела
		multi.SET( strUserSection( this.login, sectionName ), JSON.stringify( objForRedis ));

		//ToDo:временно для удаления всех ключей из Redis связанных c контроллером
		multi.SADD(setAllAccess(), strUserSection( this.login, sectionName ));

		multi.EXEC( function( err ) {
			if ( err ){
				callback( err );
			} else {
				callback( null, true );
			}
		} );
	} else if ( type === 'roleSection' ) {
		//Сохраняем данные о правах по роли
		multi.SET( strRoleSection( this.role, sectionName ), JSON.stringify( objForRedis ) );

		//ToDo:временно для удаления всех ключей из Redis связанных c контроллером
		multi.SADD( setAllAccess(), strRoleSection( this.role, sectionName ) );

		multi.EXEC( function( err ) {
			if ( err ){
				callback( err );
			} else {
				callback( null, true );
			}
		} );
	}
};

/**
 * Поиск общих данных о разделе или его правах по пользователю или роли
 *
 * @param type - строка, тип поиска
 * @param sectionName - строка, название раздела
 * @param callback
 */
ModelSection.prototype.find = function find( type, sectionName, callback ){
	if( type === 'section' ){
		//Поиск общих данных о пользователе
		this.client.GET( strSectionHash( sectionName ), function( err, reply ) {
			if ( err ){
				callback( err );
			} else {
				if ( reply ) {
					callback( null, JSON.parse( reply ) );
				} else {
					callback( );
				}
			}
		} );
	} else if ( type === 'userSection' ) {
		//Поиск прав по пользователю для раздела
		this.client.GET( strUserSection( this.login, sectionName ), function( err, reply ) {
			if ( err ){
				callback( err );
			} else {
				if ( reply ) {
					callback( null, JSON.parse( reply ) );
				} else {
					callback( );
				}
			}
		} );
	} else if ( type === 'roleSection' ) {
		//Поиск прав по роли для раздела
		this.client.GET( strRoleSection( this.role, sectionName ), function( err, reply ) {
			if ( err ){
				callback( err );
			} else {
				if ( reply ) {
					callback( null, JSON.parse( reply ) );
				} else {
					callback( );
				}
			}
		} );
	}
};

/**
 * Удаление общей информации о разделе или о его правах по пользователю или по роли
 *
 * @param type - строка, тип удаления
 * @param sectionName - строка, название раздела
 * @param callback
 */
ModelSection.prototype.delete = function del( type, sectionName, callback ){
	if( type === 'section' ){
		//Удаление общих данных о разделе
		this.client.DEL( strSectionHash( sectionName ), function( err, reply ) {
			if ( err ){
				callback( err );
			} else {
				if ( reply ) {
					callback( null, true );
				} else {
					callback( );
				}
			}
		} );
	} else if ( type === 'userSection' ) {
		//Удаление прав по пользователю для раздела
		this.client.DEL( strUserSection( this.login, sectionName ), function( err, reply ) {
			if ( err ){
				callback( err );
			} else {
				if ( reply ) {
					callback( null, true );
				} else {
					callback( );
				}
			}
		} );
	} else if ( type === 'roleSection' ) {
		//Удаление прав по роли для раздела
		this.client.DEL( strRoleSection( this.role, sectionName ), function( err, reply ) {
			if ( err ){
				callback( err );
			} else {
				if ( reply ) {
					callback( null, true );
				} else {
					callback( );
				}
			}
		} );
	}
};

/**
 * Формируем шаблон раздела
 *
 * @param sectionName - строка, название раздела
 * @param user - строка, логин пользователя
 * @param role - строка, роль пользователя
 * @param callback {err, obj}
 * 		  err - ошибки
 * 		  obj { mainContent, listView } - объект
 * 		  	  mainContent - строка с шаблоном в которые можно вставить данные о view
 * 		  	  listView - массив с названиями view необходимыми для данного раздела
 *
 */
ModelSection.prototype.getTemplate = getTemplate;
function getTemplate( sectionName, user, role, callback ){
	//Получаем объект с описание раздела и его прав по пользователю и по роли
	var multi = this.client.multi();
	var self = this;

	multi.GET( strSectionHash( sectionName ) );

	multi.GET( strRoleSection( role, sectionName ) );

	multi.GET( strUserSection( user, sectionName ) );

	multi.EXEC( function( err, reply ) {
		if( err ) {
			callback( err );
		} else {
			//Формируем объекты с общими данными о разделе и его правами по пользователю и по роли
			var objSelection = JSON.parse( reply[0] );
			var objRoleSelection = JSON.parse( reply[1] );
			var objUserSelection = JSON.parse( reply[2] );

			if ( objSelection ) {
				//Определяем что можно для данного пользователя и по данной роли (пересекаем права)
				var objParametersForSection =
					crossingAccess( sectionName, objSelection, objRoleSelection, objUserSelection );

				//Получение шаблона раздела
				getTemplateSections( self.client, objParametersForSection, role, user, callback );
			} else {
				callback( new Error( 'No data of the requested section:' + sectionName ) );
			}
		}
	} );
}

//Получение шаблона раздела
function getTemplateSections(client, objParametersForSection, role, user, callback){
	//Проверяем есть ли вложенные разделы в этот раздел
	if(objParametersForSection.displaySubSections.length !== 0){
		async.map(objParametersForSection.displaySubSections,
			function (item, cb){
				getTemplate.call({client:client}, item, user, role, cb);
			}, function(err, replies){
				if (err) {
					callback( err );
				} else {
					if ( replies.length !== 0 ) {
						objParametersForSection.subSections = replies;
					}
					//ToDo: повторяющуюся часть в отдельную функцию
					if( objParametersForSection.linkSections.length !== 0 ){
						var multi = client.multi();
						var listLink = [];
						var objListSelections = {};
						for(var i=0; i<objParametersForSection.linkSections.length; i++){
							var selectors = objParametersForSection.linkSections[i].split('_');
							multi.GET( strSectionToTitle( selectors[(selectors.length - 1)] ) );
							listLink.push(selectors[(selectors.length - 1)]);

							analysisLink(objListSelections, selectors, 0);
						}

						objParametersForSection.objListSelections = objListSelections;

						multi.EXEC(function(err, replies){
							if( err ) {
								callback( err );
							} else {
								objParametersForSection.titles = {};
								for(var i=0; i<replies.length; i++){
									objParametersForSection.titles[listLink[i]] = replies[i];
								}
								//Формирование шаблона
								callback(null,
									formingTemplateSections(objParametersForSection));
							}
						} );


					} else {
						//Формирование шаблона
						callback(null, formingTemplateSections(objParametersForSection));
					}
				}
			}
		);
	} else {
		if( objParametersForSection.linkSections.length !== 0 ){
			var multi = client.multi();
			var listLink = [];
			var objListSelections = {};
			for(var i=0; i<objParametersForSection.linkSections.length; i++){
				var selectors = objParametersForSection.linkSections.split('_');
				multi.GET( strSectionToTitle( selectors[(selectors.length - 1)] ) );
				listLink.push(selectors[(selectors.length - 1)]);

				analysisLink(objListSelections, selectors, 0);
			}

			objParametersForSection.objListSelections = objListSelections;

			multi.EXEC(function(err, replies){
				if( err ) {
					callback( err );
				} else {
					objParametersForSection.titles = {};
					for(var i=0; i<replies.length; i++){
						objParametersForSection.titles[listLink[i]] = replies[i];
					}
					//Формирование шаблона
					callback(null, formingTemplateSections(objParametersForSection));
				}
			} );


		} else {
			//Формирование шаблона
			callback(null, formingTemplateSections(objParametersForSection));
		}
	}
}

function analysisLink(obj, selectors, index){
	if(selectors.length > index) {
		if(underscore.isNumber(obj)){
			obj = {};
		}
		if(!obj[selectors[index]]){
			obj[selectors[index]] =
				analysisLink({}, selectors, (index+1));
			return obj;
		} else {
			obj[selectors[index]] = analysisLink(obj[selectors[index]], selectors, (index+1));
			return obj;
		}
	} else {
		return 1;
	}
}

//Формирование шаблона
function formingTemplateSections(objParametersForSection){

	//Формируем основное тело шаблона
	var mainContent = '<div id="' + objParametersForSection.sectionName  + '">';
	var listView = [];
	if( objParametersForSection.order && objParametersForSection.order.length !== 0 ){
		for(var i=0; i<objParametersForSection.order.length; i++) {

			if( objParametersForSection.order[i] === 'linkSections' ) {
				var template = underscore.template( objParametersForSection.templateForLinkSections.menu );
				var menu = formingTemplateForLink(objParametersForSection.objListSelections,
					objParametersForSection.templateForLinkSections,
					objParametersForSection.titles);

				var linkContent = template({ menu: menu	});
				mainContent = mainContent + linkContent;

			} else if ( objParametersForSection.order[i] === 'view' ){
				var viewContent = '';
				for( var j=0; j<objParametersForSection.view.length; j++){
					viewContent = viewContent + '<div id="<%=' + objParametersForSection.view[j] +
						'%>"><%=' + (objParametersForSection.view[j] + '_html') + '%></div>';
					listView.push(objParametersForSection.view[j]);
				}

				mainContent = mainContent + listView;
			} else if ( objParametersForSection.order[i] === 'displaySubSections' ) {
				var subSectionsContent = '';
				if (objParametersForSection.subSections){
					for( var j=0; j<objParametersForSection.subSections.length; j++){
						subSectionsContent = subSectionsContent +
							objParametersForSection.subSections[j].mainContent;
						listView =
							underscore.union(listView, objParametersForSection.subSections[j].listView);
					}
				}
				mainContent = mainContent + subSectionsContent;
			}
		}
	} else {
		if ( !underscore.isEmpty(objParametersForSection.objListSelections) ){
			var linkContent =
				underscore.template( objParametersForSection.templateForLinkSections.listItem )({
					listItem: formingTemplateForLink(objParametersForSection.objListSelections,
						objParametersForSection.templateForLinkSections,
						objParametersForSection.titles)
				});
			mainContent = mainContent + linkContent;
		}

		var viewContent = '';
		for( var j=0; j<objParametersForSection.view.length; j++){
			viewContent = viewContent + '<div id="<%=' + objParametersForSection.view[j] +
				'%>"><%=' + (objParametersForSection.view[j] + '_html') + '%></div>';
			listView.push(objParametersForSection.view[j]);
		}

		mainContent = mainContent + viewContent;

		var subSectionsContent = '';
		if ( objParametersForSection.subSections ) {
			for( var j=0; j<objParametersForSection.subSections.length; j++){
				subSectionsContent = subSectionsContent +
					objParametersForSection.subSections[j].mainContent;
				listView =
					underscore.union(listView, objParametersForSection.subSections[j].listView);
			}
			mainContent = mainContent + subSectionsContent;
		}
	}

	mainContent = mainContent + '</div>';
	return {
		mainContent: mainContent,
		listView: listView
	};
}

function formingTemplateForLink(obj, templates, titles){
	var html = '';

	var array = Object.keys(obj);
	for(var i=0; i<array.length; i++){
		if(underscore.isNumber(obj[array[i]])){
			html = html + underscore.template( templates.listItem )({listItem:titles[array[i]]});
		} else {
			var htmlNested = underscore.template( templates.menu )({
				menu: formingTemplateForLink(obj[array[i]], templates, titles)
			});
			html = html +
				underscore.template( templates.listItem )({listItem:(titles[array[i]] + htmlNested)});
		}
	}

	return html;
}

function crossingAccess(sectionName, objSelection, objRoleSelection, objUserSelection){

	var objParametersForSection = {};
	objParametersForSection.sectionName = sectionName;
	objParametersForSection.title = objSelection.title;
	//Пересекаем объект прав с сылками для навигации
	if ( objRoleSelection && objRoleSelection.linkSections) {
		var linkFromRole = objRoleSelection.linkSections;
	} else {
		var linkFromRole = {};
	}

	if ( objUserSelection && objUserSelection.linkSections) {
		var linkFromUser = objUserSelection.linkSections;
	} else {
		var linkFromUser = {};
	}

	//Формируем список разрешенных и не разрешенных разделов из роли
	var addRoleLink = [];
	var delRoleLink = [];
	var keysFromRole = Object.keys(linkFromRole);
	for( var i = 0; i < keysFromRole.length; i++ ){

		if ( underscore.isNumber( linkFromRole[keysFromRole[i]] ) ) {
			if( keysFromRole[i] === '(all)' && linkFromRole['(all)'] === 1) {
				//Формируем массив замены (all) из описания раздела
				var all = allValues( objSelection.linkSections );
				addRoleLink = underscore.union( addRoleLink, all );
			} else {
				if ( linkFromRole[keysFromRole[i]] === 1 ) {
					addRoleLink.push( keysFromRole[i] );
				} else {
					delRoleLink.push( keysFromRole[i] );
				}

			}
		} else {
			if ( linkFromRole[keysFromRole[i]]['(access)'] === 1) {
				addRoleLink.push( keysFromRole[i] );
			} else {
				delRoleLink.push( keysFromRole[i] );
			}

			var nested = nestedValues( linkFromRole[keysFromRole[i]], keysFromRole[i] );

			addRoleLink = underscore.union(addRoleLink, nestead.add);
			delRoleLink = underscore.union(delRoleLink, nestead.add);

		}
	}

	//Формируем список разрешеных и не разрешенных разделов по пользователю
	var addUserLink = [];
	var delUserLink = [];
	var keysFromUser = Object.keys(linkFromUser);
	for( var i = 0; i < keysFromUser.length; i++ ){

		if ( underscore.isNumber( linkFromUser[keysFromUser[i]] ) ) {
			if( keysFromUser[i] === '(all)'){
				if(linkFromUser['(all)'] === 1) {
					//Формируем массив замены (all) из описания раздела
					var all = allValues( objSelection.linkSections );
					addUserLink = underscore.union( addUserLink, all );
				} else {
					//Формируем массив замены (all) из описания раздела
					var all = allValues( objSelection.linkSections );
					delUserLink = underscore.union( delUserLink, all );
				}
			} else {
				if ( linkFromUser[keysFromUser[i]] === 1 ) {
					addUserLink.push( keysFromUser[i] );
				} else {
					delUserLink.push( keysFromUser[i] );
				}
			}
		} else {
			if ( linkFromUser[keysFromUser[i]]['(access)'] === 1) {
				addUserLink.push( keysFromUser[i] );
			} else {
				delUserLink.push( keysFromUser[i] );
			}

			var nested = nestedValues( linkFromUser[keysFromUser[i]], keysFromUser[i] );

			addRoleLink = underscore.union(addRoleLink, nestead.add);
			delRoleLink = underscore.union(delRoleLink, nestead.add);

		}
	}

	//Пересекаем сформированные справочники
	var linkSections = underscore.difference( addRoleLink, delRoleLink );
	linkSections = underscore.union( linkSections, addUserLink );
	linkSections = underscore.difference( linkSections, delUserLink );
	objParametersForSection.linkSections = linkSections;


	//Пересекаем объект с подразделами, которые будут отображаться в этом разделе
	if ( objRoleSelection && objRoleSelection.displaySubSections ) {
		var objDisplayRole = objRoleSelection.displaySubSections;
	} else {
		var objDisplayRole = {};
	}
	if ( objUserSelection && objUserSelection.displaySubSections ) {
		var objDisplayUser = objUserSelection.displaySubSections;
	} else {
		var objDisplayUser = {};
	}

	//Формируем словари разрешенных и неразрешенных отображаемых разделов по роли
	var addDisplayRole = [];
	var delDisplayRole = [];
	var aDisplayRole = Object.keys( objDisplayRole );

	for( var i=0; i < aDisplayRole.length; i++ ){
		if(aDisplayRole[i] === '(all)' && objDisplayRole[aDisplayRole[i]] === 1) {
			addDisplayRole = underscore.union(addDisplayRole, objSelection.displaySubSections);
		} else {
			if (objDisplayRole[aDisplayRole[i]] === 1) {
				addDisplayRole.push(aDisplayRole[i]);
			} else {
				delDisplayRole.push(aDisplayRole[i]);
			}
		}
	}

	//Формируем словари разрешенных и неразрешенных отображаемых разделов по пользователю
	var addDisplayUser = [];
	var delDisplayUser = [];
	var aDisplayUser = Object.keys( objDisplayUser );

	for( var i=0; i < aDisplayUser.length; i++ ){
		if(aDisplayUser[i] === '(all)') {
			if(objDisplayUser[aDisplayUser[i]] === 1) {
				addDisplayUser = underscore.union(addDisplayUser, objSelection.displaySubSections);
			} else {
				delDisplayUser = underscore.union(delDisplayUser, objSelection.displaySubSections);
			}
		} else {
			if (objDisplayUser[aDisplayUser[i]] === 1) {
				addDisplayUser.push(aDisplayUser[i]);
			} else {
				delDisplayUser.push(aDisplayUser[i]);
			}
		}
	}

	//Пересекаем сформированные справочники
	var displaySubSections = underscore.difference( addDisplayRole, delDisplayRole );
	displaySubSections = underscore.union( displaySubSections, addDisplayUser );
	displaySubSections = underscore.difference( displaySubSections, delDisplayUser );
	objParametersForSection.displaySubSections = displaySubSections;

	//ToDo: доделать вызов формирования шаблонов отображаемых подразделов

	//Пересекаем объект с view данного раздела
	if ( objRoleSelection && objRoleSelection.view ) {
		var objViewRole = objRoleSelection.view;
	} else {
		var objViewRole = {};
	}
	if ( objUserSelection && objUserSelection.view ) {
		var objViewUser = objUserSelection.view;
	} else {
		var objViewUser = {};
	}

	//Формируем словари разрешенных и неразрешенных view по роли
	var addViewRole = [];
	var delViewRole = [];
	var aViewRole = Object.keys( objViewRole );

	for( var i=0; i < aViewRole.length; i++ ){
		if(aViewRole[i] === '(all)' && objViewRole[aViewRole[i]] === 1) {
			addViewRole = underscore.union(addViewRole, objSelection.view);
		} else {
			if (objViewRole[aViewRole[i]] === 1) {
				addViewRole.push(aViewRole[i]);
			} else {
				delViewRole.push(aViewRole[i]);
			}
		}
	}

	//Формируем словари разрешенных и неразрешенных view по пользователю
	var addViewUser = [];
	var delViewUser = [];
	var aViewUser = Object.keys( objViewUser );

	for( var i=0; i < aViewUser.length; i++ ){
		if(aViewUser[i] === '(all)') {
			if(objViewUser[aViewUser[i]] === 1) {
				addViewUser = underscore.union(addViewUser, objSelection.view);
			} else {
				delViewUser = underscore.union(delViewUser, objSelection.view);
			}
		} else {
			if (objViewUser[aViewUser[i]] === 1) {
				addViewUser.push(aViewUser[i]);
			} else {
				delViewUser.push(aViewUser[i]);
			}
		}
	}

	//Пересекаем сформированные справочники
	var view = underscore.difference( addViewRole, delViewRole );
	view = underscore.union( view, addViewUser );
	view = underscore.difference( view, delViewUser );
	objParametersForSection.view = view;

	//Анализируем параметры options по пользоватлю, роли и в общих данных раздела

	//Шаблоны для отображения навигации
	var templateForLinkSections;

	if( objUserSelection && objUserSelection.options &&objUserSelection.options.templateForLinkSections ) {
		var templateForLinkUser = objUserSelection.options.templateForLinkSections;
	} else {
		var templateForLinkUser = {};
	}

	if ( objRoleSelection && objRoleSelection.options && objRoleSelection.options.templateForLinkSections ) {
		var templateForLinkRole = objRoleSelection.options.templateForLinkSections;
	} else {
		var templateForLinkRole = {};
	}

	if( Object.keys(templateForLinkUser).length !== 0 ) {
		templateForLinkSections = templateForLinkUser;
	} else if( Object.keys(templateForLinkRole).length !== 0 ) {
		templateForLinkSections = templateForLinkRole;
	} else {
		templateForLinkSections = objSelection.options.templateForLinkSections;
	}
	objParametersForSection.templateForLinkSections = templateForLinkSections;

	//Порядок отображения блоков в разделе
	var order;
	if ( objUserSelection && objUserSelection.options && objUserSelection.options.order ) {
		var orderUser = objUserSelection.options.order;
	} else {
		var orderUser = [];
	}
	if ( objRoleSelection && objRoleSelection.options && objRoleSelection.options.order ) {
		var orderRole = objUserSelection.options.order;
	} else {
		var orderRole = [];
	}


	if( orderUser.length !== 0 ) {
		order = orderUser;
	} else if( orderRole.length !== 0 ) {
		order = orderRole;
	} else {
		order = objSelection.options.order;
	}
	objParametersForSection.order = order;

	//CSS класс раздела
	var cssClassForSelection;
	if ( objUserSelection && objUserSelection.options && objUserSelection.options.cssClassForSelection ) {
		var cssUser = objUserSelection.options.cssClassForSelection;
	} else {
		var cssUser = null;
	}

	if ( objRoleSelection && objRoleSelection.options.cssClassForSelection ) {
		var cssRole = objRoleSelection.options.cssClassForSelection;
	} else {
		var cssRole = null;
	}

	if( cssUser ) {
		cssClassForSelection = cssUser;
	} else if( cssRole ) {
		cssClassForSelection = cssRole;
	} else {
		cssClassForSelection = objSelection.options.cssClassForSelection;
	}
	objParametersForSection.cssClassForSelection = cssClassForSelection;

	return objParametersForSection;

}

function nestedValues(obj, prefix){
	var add = [];
	var del = [];

	var values = Object.keys( obj );

	for( var i=0; i < values.length; i++ ) {

		if(values[i] !== '(access)'){

			if ( underscore.isNumber( obj[values[i]] ) ) {

				if ( obj[values[i]] === 1 ) {
					add.push( prefix + '_' + values[i] );
				} else {
					del.push( prefix + '_' + values[i] );
				}

			} else {

				if( obj[values[i]]['(access)'] === 1 ) {
					add.push(prefix + '_' + values[i]);
				} else {
					del.push(prefix + '_' + values[i]);
				}

				var nestead = nestedValues( obj[values[i]], prefix + '_' + values[i] );

				add = underscore.union(add, nestead.add);
				del = underscore.union(del, nestead.add);

			}

		}

	}

	return { add:add, del:del };

}

function allValues(obj){
	var all = [];

	for ( var i = 0; i < obj.length; i++ ) {

		if( underscore.isString( obj[i] ) ) {

			all.push(obj[i]);

		} else {
			//Вызываем эту же функцию для объекта
			var prefix = Object.keys(obj[i]);
			all.push(prefix[0]);
			var values = allValues(obj[i][prefix[0]]);
			for(var j = 0; j < values.length; j++ ){
				all.push( prefix + '_' + values[j] );
			}

		}

	}

	return all;
}


//Формирование ключа Redis (SET) для множества всех ключей с правами
function setAllAccess(){
	return 'all:access:';
}

//Формирование строки ключа Redis (STRING) для хранения соответствия названия раздела и его title
function strSectionToTitle( sectionName ) {
	return 'section:title:' + sectionName;
}

//Формирования ключа Redis (STRING) для обращения к хешу с информацией о разделе
function strSectionHash(sectionName){
	return 'section:' + sectionName;
}

//Формирование ключа Redis (STRING) для обращения к хешу с информацией о доступе к рахделу по пользователю
function strUserSection(user, sectionName){
	return 'section:user:' + user + ':' + sectionName;
}

//Формирование ключа Redis (STRING) для обращения к хешу с информацией о доступе к рахделу по роли
function strRoleSection(role, sectionName){
	return 'section:role:' + role + ':' + sectionName;
}

