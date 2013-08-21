Controller
=====
## Инсталяция:
* один раз выполнить настройки Linux указанный по ссылке https://github.com/f0-soft/wiki/wiki/Npm-install-from-private-github
* запустить команду: npm install git+ssh://git@github.com:f0-soft/controller.git
* контроллер будет находится в node_modules/f0.controller

## Тестирование:
* включить mock view (изменить в файле config/config.js значения объекта mock на {view:true}, для отключения необходимо эти значения поменять на false)
* запустить test_with_mock_view.js
!!! mock view работает формально (не сохраняет документы)

## Подключение:
var Controller = require('controller');

## init( config, callback )
Запускает инициализацию контроллера:
* создание клиента redis
* сохранение ссылки на инициализированную view или на её mock
* сохранение ссылки на объект с данными из схем flexo коллекций
* сохранение ссылки на объект с данными схемы меню
* сохранение ссылки на объект с данными схемы form

Параметры:
* config - объект с параметрами
    * [redisConfig] — объект хранящий в себе параметры подключения к Redis
        * config.port — число, порт Redis
        * config.host — строка, хост Redis
        * [config.max_attempts] — число, количество попыток подключения
    * view - ccылка на проинициализированную view
    * viewConfig - объкт с описание _vid во view с указанием данных об используемых flexo в виде: {viewName:{_vid:{flexo:[flexoSchemeName, field, ..], type:'read/modify/create'}}}, где viewName - свойство объекта с переменным именем, название view; _vid - свойство объекта с переменным именем, идентификатор элемента view; flexo - название поля объекта, содержит в себе массив первым элементом которого обезательно указывается имя flexo схемы (flexoSchemeName) , последующие элементы это названия полей; type - название поля объекта, содержащая в себя строку 'read' или 'modify', в зависимотсти от типа операции с БД.
    * flexoSchemes - объект с описанием flexo схем в виде: {nameFlexoScheme:{read:[], modify:[]}}, где nameFlexoScheme - свойство объекта с переменным именем, имя flexo cхемы; read - название поля объекта, содержащий массив полей разрешенных читать; modify - название поля объекта, содержащий массив полей разрешенных модифицировать.
* callback (err, reply) - функция обратного вызова
    * err - ошибка подключения к Redis от node_redis
    * reply - логическое, возвращается true в случае успешной инициализации контроллера.

## Примеры объектов прав для view и flexo
Шаблон объекта прав для view:
{_viewId:ассess}, где:
* _viewId - строка, идентификатор view, или специализированная команда '(all)' обозначающая все _viewId доступные из конфига
* ассess - число, 0 (запрещено) или 1 (разрешено)


Примеры объекта прав для view:
'''
    var testObjAccess1 = {
        'a':0,
        'b':1,
        'c':1,
        ...
    };
    var testObjAccess2 = {
        '(all)':0,
        'a':1,
        ...
    };
    var testObjAccess3 = {
        '(all)':1,
        'a':0,
        ...
    };
'''

Шаблон объекта прав для одной flexo схемы:
{read: {fieldName:access}, modify: {fieldName:access}, create: {fieldName:access}, createAll:access, delete: access}, где:
* read - объект содержащий в себе поля flexo c указанием доступа на чтение
* modify - объект содержащий в себе поля flexo c указанием доступа на модификацию
* create - объект содержащий в себе поля flexo c указанием доступа на создание
* createAll - содержит в себе разрешение на создание flexo документа в целом
* delete - содержит в себе разрешение на удаление flexo документа в целом
* fieldName - строка, название поля flexo документа, или специализированная команда '(all)' обозначающая все поля доступные из конфига для данной flexo документа
* ассess - число, 0 (запрещено) или 1 (разрешено)

Пример объекта прав для flexo:
'''
    var testObjAccess = {
        read: {
            field1:1,
            field2:0,
            field3:1,
            ...
        },
        modify: {
            '(all)':1,
            field1:0,
            ...
        },
        create: {
            '(all)':0,
            field1:1,
            ...
        },
        createAll: 0,
        delete: 1
    };
'''

## find( query, callback )
Читает запрашиваемые права или данные пользователя, а именно:
* проверяется наличие необходимых параметров в запросе для поиска
* при поиске прав:
    * создается модель прав и осуществляется поиск объекта прав
* при поиске данных о пользователе:
    * просто запрос по id или логину возвращаются кеш с данными из redis
    * сложные запросы на поиск обрабатываются в mongo с использованием flexo коллекции и redis для получения паролей, если такое поле указано в options.fields

Параметры:
* query - объект запрос
    * [user] - объект содержащий параметры поиска пользователя
        * [login]/[_id] - строка, логин пользователя или идентификатор пользователя для организациия простого поиска пользователя из redis (например, для получения сведеней о пользователе при его аутентификации)
        * [queries] - объект запрос в формате {flexoSchemeName:{selector:{},properties:{}}}, где selector - объект поисковый запрос Mongo, options - объект с дополнительными параметрами (limit - число, ограничение количества результатов поиска, skip - число, смещение ограничения количества результатов поиска, sort - объект или массив объектов sort, правило сортировки Mongo, hint - объект, содержит указание по выбору индекса Mongo)
        * [count] - логическое, опция сложного запроса количества документов удовлетворяющих запросу
        * [inline] - логическое, опция сложного запроса производить ли подстановку дочерних документов в родительские
    * [access] - объект содержащий параметры поиска прав доступа
        * [flexoSchemeName]/[viewName] - строка, название flexo схемы или view
        * [role]/[login] - строка, роль или логин пользователя искомого объекта прав
* callback(err, reply) — функция обратного вызова
    * err - ...
    * reply - возвращается объект с информацией о пользователе, или запрашиваемые объект прав, при сложном запросе данных о пользователе возвращается массив объектов

## delete( query, callback )
Удаляем пользователя или объект прав
* проверяется наличие необходимых параметров в запросе для удаления
* при удалении прав:
    * создается модель прав и осуществляется её удаление
* при удалении пользователя:
    * создается модель пользователя
    * осуществляется удаление из mongo с использованием flexo коллекции
    * осуществляется удаление из redis

Параметры:
* query - объект запрос
    * [user] - объект содержащий параметры удаления пользователя
        * [query] - объект запрос на удаление пользователя
            * selector - объект содержащий _id удаляемого пользователя
    * [access] - объект содержащий параметры удаления прав доступа
        * [flexoSchemeName]/[viewName] - строка, название flexo схемы или view
        * [role]/[login] - строка, роль удаляемого объекта прав или логин пользователя
* callback(err, reply) — функция обратного вызова
    * err - ...
    * reply - возвращается логическое true при успешном выполнении операции, при удалении пользователя возвращается _id удаленного пользователя

## create( query, callback )
Создаем пользователя или объект прав
* проверяется наличие неоходимых параметров в запросе для создания
* при создании объекта прав:
    * создается модель прав, наполняем её пришедшими данными и сохраняем в redis
* при создании пользователя:
    * создается модель пользователя
    * проверяется уникальность создаваемого пользователя
    * сохраняются данные (без пароля) в mongo с использованием view
    * сохраняются данные в redis

Параметры:
* query - объект запрос
    * [user] - объект содержащий запрос на создание пользователя в виде {queries:{flexoSchemeName:{fieldsName:value}}
    * [access] - объект содержащий параметры создания прав доступа
        * [flexoSchemeName]/[viewName] - строка, название flexo схемы или view
        * [role]/[login] - строка, роль или логин пользователя создаваемого объекта прав
        * objAccess - объект с описание прав доступа
* callback(err, reply) — функция обратного вызова
    * err - ...
    * reply - возвращается логическое true при успешном выполнении операции, при создании пользователя возвращается _id созданного пользователя

## modify( query, callback )
Модификация данных пользователя или объекта прав
* проверяется наличие необходимых параметров в запросе для модификации
* при модификации объекта прав:
    * тоже что и при create (создается модель прав, наполняем её пришедшими данными и сохраняем в redis)
* при модификации пользователя:
    * осуществляется изменения в mongo посредством view
    * создается модель пользователя
    * считывается предыдущуй кеш из redis с данными о пользователе
    * вносятся изменения в кеш не затрагивая поле _id
    * сохраняется измененный кеш в redis

Параметры:
* query - объект запрос
    * [user] - объект запрос на изменение данных о пользователе
        * [queries] - объект запрос в формате {flexoSchemeName:{selector:{},properties:{}}, где selector - объект содержащий _id пользователя, properties - объект содержащий только измененные данные о пользователе в виде {fieldName:value}
    * [access] - объект содержащий параметры модификации прав доступа
        * [flexoSchemeName]/[viewName] - строка, название flexo схемы или view
        * [role]/[login] - строка, роль или логин пользователя модифицируемого объекта прав
        * objAccess - объект с описание прав доступа
* callback(err, reply) — функция обратного вызова
    * err - ...
    * reply - возвращается логическое true при успешном выполнении операции, при модификации пользователя возвращается _id пользователя

## getTemplate ( name, user, role, socket, callback )
Обрабатываем запрос для получения шаблона view:
* создаем модели прав на view по роли и по пользователю определяем пересечение прав по которому определяем перечень разрешенных идентификаторов view
* создаем модели прав по роли и по пользователю на flexo схемы входящие во view и находим их пересечения, по определенным пересечениям прав уточняем список разрешенных идентификаторов view
* сформированный массив разрешенных идентификаторов передаем во view
* получаем от view список разрешенных _vid и прикрепляем их к объекту socket
* получаем от view шаблон и/или конфиг и возвращаем их в колбэке

Параметры:
* [name] - строка, имя view
* user - строка, логин пользователя
* role - строка, роль искомого объекта прав
* socket - объект сокета
* callback (err, config, template) — функция обратного вызова
    * err - ошибка работы с Redis от node_redis, отсутствие прав, ошибки от view
    * config - объект, содержит клиентский конфиг
    * template - строка, содержит клиентский шаблон

## queryToView ( type, request, viewName, socket, callback )
Обрабатывает запросы по работе с данными из view:
* проверяется наличия готового пересечения разрешенных _vid для view прикрепленного к socket
* проверяем права на чтение, модификацию, удаление, изменение в зависимости от типа запроса, а именно:
    * при проверке чтения, проверяются идентификаторы _vid для view в объектах queries.selector и queries.options.sort на их разрешение чтения в глобальном конфиге view и разрешении обращения к этому _vid в объекте прикрепленным к socket для данного view
    * при проверке создания, проверяются идентификаторы _vid для view в объекте queries или в массиве объектов queries на их разрешение создания в глобальном конфиге view и разрешении обращения к этому _vid в объекте прикрепленным к socket для данного view
    * при проверке модификации, проверяются идентификаторы _vid для view в объекте queries.properties или в массиве объектов queries[].properties на их разрешение модификации в глобальном конфиге view и разрешении обращения к этому _vid в объекте прикрепленным к socket для данного view
    * при проверке удаления, проверяются идентификаторы _vid для view в объекте queries.selector или в массиве объектов queries[].selector на их разрешение удаления в глобальном конфиге view и разрешении обращения к этому _vid в объекте прикрепленным к socket для данного view
* в случае успешной проверки передаем необходимые параметры во view

Параметры:
* type - строка тип запроса (read, create, modify, delete)
* request - объект, запрос пользователя
    * queries - объект, содержит запросы к соответствующим flexo
* viewName - строка, имя view
* socket - объект сокета (временно для нахождения прав необходимо прикрепить login и роль)
* callback (err, reply, count) — функция обратного вызова
     * err — ошибка работы с Redis от node_redis, отсутствие прав, ошибки от view
     * reply —

Пример работы с контроллером представлен в файле: test.js