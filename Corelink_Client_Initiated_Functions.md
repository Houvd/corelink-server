Client Initiated Control Functions
==================================

auth
----

authenticate a user

##### Request:

| arguments          | description                                                                         | type  | sample                | default   |
|:------------------:|:------------------------------------------------------------------------------------|:-----:|:----------------------|:----------|
|function            |function to select and run                                                           |string |auth                   |           |
|username            |User name to authenticate                                                            |string |Testuser               |           |
|password            |Password for this user                                                               |string |Testpassword           |           |
|token               |If no username or password are given an app can authenticate with this token otherwise it can be omitted or left empty|string |                       |           |

##### Response:

| responses          | description                                                                         | type  | sample                | optional |
|:------------------:|:------------------------------------------------------------------------------------|:-----:|:----------------------|:--------:|
|token               |token for the user to authenticate                                                   |string |                       | false    |
|IP                  |source IP of the client                                                              |string |                       | false    |
|statusCode          |result code of the function                                                          |string |0                      | false    |
|message             |optional status message                                                              |string |                       | true     |


keepAlive
---------

ping the server to keep alive

##### Request:

| arguments          | description                                                                         | type  | sample                | default   |
|:------------------:|:------------------------------------------------------------------------------------|:-----:|:----------------------|:----------|
|function            |function to select and run                                                           |string |keepAlive              |           |
|token               |token for the user to authenticate                                                   |string |                       |           |

##### Response:

| responses          | description                                                                         | type  | sample                | optional |
|:------------------:|:------------------------------------------------------------------------------------|:-----:|:----------------------|:--------:|
|statusCode          |result code of the function                                                          |string |0                      | false    |
|message             |optional status message                                                              |string |                       | true     |


listFunctions
-------------

list available client functions

##### Request:

| arguments          | description                                                                         | type  | sample                | default   |
|:------------------:|:------------------------------------------------------------------------------------|:-----:|:----------------------|:----------|
|function            |function to select and run                                                           |string |listFunctions          |           |
|token               |token for the user to authenticate                                                   |string |                       |           |

##### Response:

| responses          | description                                                                         | type  | sample                | optional |
|:------------------:|:------------------------------------------------------------------------------------|:-----:|:----------------------|:--------:|
|functionList        |list of functions                                                                    |string |auth,keepAlive,listFunctions,listServerFunctions,describeFunction,describeServerFunction,listWorkspaces,addWorkspace,setDefaultWorkspace,getDefaultWorkspace,rmWorkspace,addUser,password,rmUser,getUser,setUser,listUsers,addGroup,addUserGroup,rmUserGroup,changeOwner,rmGroup,listGroups,sender,listStreams,streamInfo,receiver,subscribe,unsubscribe,setConfig,disconnect,expire| false    |
|statusCode          |result code of the function                                                          |string |0                      | false    |
|message             |optional status message                                                              |string |                       | true     |


listServerFunctions
-------------------

list available server functions

##### Request:

| arguments          | description                                                                         | type  | sample                | default   |
|:------------------:|:------------------------------------------------------------------------------------|:-----:|:----------------------|:----------|
|function            |function to select and run                                                           |string |listServerFunctions    |           |
|token               |token for the user to authenticate                                                   |string |                       |           |

##### Response:

| responses          | description                                                                         | type  | sample                | optional |
|:------------------:|:------------------------------------------------------------------------------------|:-----:|:----------------------|:--------:|
|functionList        |list of server functions                                                             |string |update,subscriber,stale,dropped| false    |
|statusCode          |result code of the function                                                          |string |0                      | false    |
|message             |optional status message                                                              |string |                       | true     |


describeFunction
----------------

retrieve client initiated function description

##### Request:

| arguments          | description                                                                         | type  | sample                | default   |
|:------------------:|:------------------------------------------------------------------------------------|:-----:|:----------------------|:----------|
|function            |function to select and run                                                           |string |describeFunction       |           |
|functionName        |function to get info about                                                           |string |listFunctions          |           |
|token               |token for the user to authenticate                                                   |string |                       |           |

##### Response:

| responses          | description                                                                         | type  | sample                | optional |
|:------------------:|:------------------------------------------------------------------------------------|:-----:|:----------------------|:--------:|
|description         |information about the function                                                       |object |[object Object]        | false    |
|statusCode          |result code of the function                                                          |string |0                      | false    |
|message             |optional status message                                                              |string |                       | true     |


describeServerFunction
----------------------

retrieve description of server initiated function

##### Request:

| arguments          | description                                                                         | type  | sample                | default   |
|:------------------:|:------------------------------------------------------------------------------------|:-----:|:----------------------|:----------|
|function            |function to select and run                                                           |string |describeServerFunction |           |
|functionName        |server function to get info about                                                    |string |update                 |           |
|token               |token for the user to authenticate                                                   |string |                       |           |

##### Response:

| responses          | description                                                                         | type  | sample                | optional |
|:------------------:|:------------------------------------------------------------------------------------|:-----:|:----------------------|:--------:|
|description         |information about the function                                                       |object |[object Object]        | false    |
|statusCode          |result code of the function                                                          |string |0                      | false    |
|message             |optional status message                                                              |string |                       | true     |


listWorkspaces
--------------

list existing workspaces

##### Request:

| arguments          | description                                                                         | type  | sample                | default   |
|:------------------:|:------------------------------------------------------------------------------------|:-----:|:----------------------|:----------|
|function            |function to select and run                                                           |string |listWorkspaces         |           |
|token               |token for the user to authenticate                                                   |string |                       |           |

##### Response:

| responses          | description                                                                         | type  | sample                | optional |
|:------------------:|:------------------------------------------------------------------------------------|:-----:|:----------------------|:--------:|
|workspaceList       |array of available workspaces                                                        |array  |Log,Holodeck,Chalktalk,Infinite| false    |
|statusCode          |result code of the function                                                          |string |0                      | false    |
|message             |optional status message                                                              |string |                       | true     |


addWorkspace
------------

add a new workspace

##### Request:

| arguments          | description                                                                         | type  | sample                | default   |
|:------------------:|:------------------------------------------------------------------------------------|:-----:|:----------------------|:----------|
|function            |function to select and run                                                           |string |addWorkspace           |           |
|workspace           |name of the workspace                                                                |string |newworkspace           |           |
|token               |token for the user to authenticate                                                   |string |                       |           |

##### Response:

| responses          | description                                                                         | type  | sample                | optional |
|:------------------:|:------------------------------------------------------------------------------------|:-----:|:----------------------|:--------:|
|statusCode          |result code of the function                                                          |string |0                      | false    |
|message             |optional status message                                                              |string |                       | true     |


setDefaultWorkspace
-------------------

set a default workspace

##### Request:

| arguments          | description                                                                         | type  | sample                | default   |
|:------------------:|:------------------------------------------------------------------------------------|:-----:|:----------------------|:----------|
|function            |function to select and run                                                           |string |setDefaultWorkspace    |           |
|workspace           |name of the workspace                                                                |string |newworkspace           |           |
|token               |token for the user to authenticate                                                   |string |                       |           |

##### Response:

| responses          | description                                                                         | type  | sample                | optional |
|:------------------:|:------------------------------------------------------------------------------------|:-----:|:----------------------|:--------:|
|statusCode          |result code of the function                                                          |string |0                      | false    |
|message             |optional status message                                                              |string |                       | true     |


getDefaultWorkspace
-------------------

get a default workspace

##### Request:

| arguments          | description                                                                         | type  | sample                | default   |
|:------------------:|:------------------------------------------------------------------------------------|:-----:|:----------------------|:----------|
|function            |function to select and run                                                           |string |getDefaultWorkspace    |           |
|token               |token for the user to authenticate                                                   |string |                       |           |

##### Response:

| responses          | description                                                                         | type  | sample                | optional |
|:------------------:|:------------------------------------------------------------------------------------|:-----:|:----------------------|:--------:|
|statusCode          |result code of the function                                                          |string |0                      | false    |
|workspace           |the default workspace or empty if no default workspace is set                        |string |newworkspace           | false    |
|message             |optional status message                                                              |string |                       | true     |


rmWorkspace
-----------

remove an existing workspace

##### Request:

| arguments          | description                                                                         | type  | sample                | default   |
|:------------------:|:------------------------------------------------------------------------------------|:-----:|:----------------------|:----------|
|function            |function to select and run                                                           |string |rmWorkspace            |           |
|workspace           |name of the workspace                                                                |string |newworkspace           |           |
|token               |token for the user to authenticate                                                   |string |                       |           |

##### Response:

| responses          | description                                                                         | type  | sample                | optional |
|:------------------:|:------------------------------------------------------------------------------------|:-----:|:----------------------|:--------:|
|statusCode          |result code of the function                                                          |string |0                      | false    |
|message             |optional status message                                                              |string |                       | true     |


addUser
-------

add a new User

##### Request:

| arguments          | description                                                                         | type  | sample                | default   |
|:------------------:|:------------------------------------------------------------------------------------|:-----:|:----------------------|:----------|
|function            |function to select and run                                                           |string |addUser                |           |
|username            |name of the user                                                                     |string |newuser                |           |
|password            |password of the user                                                                 |string |password               |           |
|admin               |user is an admin                                                                     |boolean|                       |false      |
|first               |first name of the user                                                               |string |firstname              |           |
|last                |last name of the user                                                                |string |lastname               |           |
|email               |email of the user                                                                    |string |test@gmail.com         |           |
|token               |token for the user to authenticate                                                   |string |                       |           |

##### Response:

| responses          | description                                                                         | type  | sample                | optional |
|:------------------:|:------------------------------------------------------------------------------------|:-----:|:----------------------|:--------:|
|statusCode          |result code of the function                                                          |string |0                      | false    |
|message             |optional status message                                                              |string |                       | true     |


password
--------

change password for an existing User

##### Request:

| arguments          | description                                                                         | type  | sample                | default   |
|:------------------:|:------------------------------------------------------------------------------------|:-----:|:----------------------|:----------|
|function            |function to select and run                                                           |string |password               |           |
|password            |new password of the User                                                             |string |Testpassword           |           |
|token               |token for the user to authenticate                                                   |string |                       |           |

##### Response:

| responses          | description                                                                         | type  | sample                | optional |
|:------------------:|:------------------------------------------------------------------------------------|:-----:|:----------------------|:--------:|
|statusCode          |result code of the function                                                          |string |0                      | false    |
|message             |optional status message                                                              |string |                       | true     |


rmUser
------

remove an existing User

##### Request:

| arguments          | description                                                                         | type  | sample                | default   |
|:------------------:|:------------------------------------------------------------------------------------|:-----:|:----------------------|:----------|
|function            |function to select and run                                                           |string |rmUser                 |           |
|username            |name of the User                                                                     |string |newuser                |           |
|token               |token for the user to authenticate                                                   |string |                       |           |

##### Response:

| responses          | description                                                                         | type  | sample                | optional |
|:------------------:|:------------------------------------------------------------------------------------|:-----:|:----------------------|:--------:|
|statusCode          |result code of the function                                                          |string |0                      | false    |
|message             |optional status message                                                              |string |                       | true     |


getUser
-------

get user with username

##### Request:

| arguments          | description                                                                         | type  | sample                | default   |
|:------------------:|:------------------------------------------------------------------------------------|:-----:|:----------------------|:----------|
|function            |function to select and run                                                           |string |getUser                |           |
|token               |token for the user to authenticate                                                   |string |                       |           |
|username            |username of the selected User                                                        |string |Testuser               |           |

##### Response:

| responses          | description                                                                         | type  | sample                | optional |
|:------------------:|:------------------------------------------------------------------------------------|:-----:|:----------------------|:--------:|
|user                |data of the user                                                                     |array  |                       | false    |
|statusCode          |result code of the function                                                          |string |0                      | false    |
|message             |optional status message                                                              |string |                       | true     |


setUser
-------

get user with username

##### Request:

| arguments          | description                                                                         | type  | sample                | default   |
|:------------------:|:------------------------------------------------------------------------------------|:-----:|:----------------------|:----------|
|function            |function to select and run                                                           |string |setUser                |           |
|token               |token for the user to authenticate                                                   |string |                       |           |
|oldUsername         |name of the user                                                                     |string |newuser                |           |
|username            |name of the user                                                                     |string |newuser                |           |
|password            |password of the user                                                                 |string |password               |           |
|admin               |user is an admin                                                                     |boolean|                       |false      |
|first               |first name of the user                                                               |string |firstname              |           |
|last                |last name of the user                                                                |string |lastname               |           |
|email               |email of the user                                                                    |string |test@gmail.com         |           |

##### Response:

| responses          | description                                                                         | type  | sample                | optional |
|:------------------:|:------------------------------------------------------------------------------------|:-----:|:----------------------|:--------:|
|statusCode          |result code of the function                                                          |string |0                      | false    |
|message             |optional status message                                                              |string |                       | true     |


listUsers
---------

list existing users

##### Request:

| arguments          | description                                                                         | type  | sample                | default   |
|:------------------:|:------------------------------------------------------------------------------------|:-----:|:----------------------|:----------|
|function            |function to select and run                                                           |string |listUsers              |           |
|token               |token for the user to authenticate                                                   |string |                       |           |

##### Response:

| responses          | description                                                                         | type  | sample                | optional |
|:------------------:|:------------------------------------------------------------------------------------|:-----:|:----------------------|:--------:|
|userList            |array of available users                                                             |array  |                       | false    |
|statusCode          |result code of the function                                                          |string |0                      | false    |
|message             |optional status message                                                              |string |                       | true     |


addGroup 
---------

add a new Group

##### Request:

| arguments          | description                                                                         | type  | sample                | default   |
|:------------------:|:------------------------------------------------------------------------------------|:-----:|:----------------------|:----------|
|function            |function to select and run                                                           |string |addGroup               |           |
|group               |name of the new Group                                                                |string |group                  |           |
|token               |token for the user to authenticate                                                   |string |                       |           |

##### Response:

| responses          | description                                                                         | type  | sample                | optional |
|:------------------:|:------------------------------------------------------------------------------------|:-----:|:----------------------|:--------:|
|statusCode          |result code of the function                                                          |string |0                      | false    |
|message             |optional status message                                                              |string |                       | true     |


addUserGroup 
-------------

add a user to a Group

##### Request:

| arguments          | description                                                                         | type  | sample                | default   |
|:------------------:|:------------------------------------------------------------------------------------|:-----:|:----------------------|:----------|
|function            |function to select and run                                                           |string |addUserGroup           |           |
|group               |name of the  Group                                                                   |string |group                  |           |
|user                |name user attached to the Group                                                      |string |admin                  |           |
|token               |token for the user to authenticate                                                   |string |                       |           |

##### Response:

| responses          | description                                                                         | type  | sample                | optional |
|:------------------:|:------------------------------------------------------------------------------------|:-----:|:----------------------|:--------:|
|statusCode          |result code of the function                                                          |string |0                      | false    |
|message             |optional status message                                                              |string |                       | true     |


rmUserGroup 
------------

remove a user to a Group

##### Request:

| arguments          | description                                                                         | type  | sample                | default   |
|:------------------:|:------------------------------------------------------------------------------------|:-----:|:----------------------|:----------|
|function            |function to select and run                                                           |string |rmUserGroup            |           |
|group               |name of the Group                                                                    |string |group                  |           |
|user                | user that need to remove from that Group                                            |string |admin                  |           |
|token               |token for the user to authenticate                                                   |string |                       |           |

##### Response:

| responses          | description                                                                         | type  | sample                | optional |
|:------------------:|:------------------------------------------------------------------------------------|:-----:|:----------------------|:--------:|
|statusCode          |result code of the function                                                          |string |0                      | false    |
|message             |optional status message                                                              |string |                       | true     |


changeOwner
-----------

change an existing Group ownership

##### Request:

| arguments          | description                                                                         | type  | sample                | default   |
|:------------------:|:------------------------------------------------------------------------------------|:-----:|:----------------------|:----------|
|function            |function to select and run                                                           |string |changeOwner            |           |
|group               |name of the Group                                                                    |string |group                  |           |
|username            |name of the new owner                                                                |string |Testuser               |           |
|token               |token for the user to authenticate                                                   |string |                       |           |

##### Response:

| responses          | description                                                                         | type  | sample                | optional |
|:------------------:|:------------------------------------------------------------------------------------|:-----:|:----------------------|:--------:|
|statusCode          |result code of the function                                                          |string |0                      | false    |
|message             |optional status message                                                              |string |                       | true     |


rmGroup
-------

remove an existing Group

##### Request:

| arguments          | description                                                                         | type  | sample                | default   |
|:------------------:|:------------------------------------------------------------------------------------|:-----:|:----------------------|:----------|
|function            |function to select and run                                                           |string |rmGroup                |           |
|group               |name of the Group                                                                    |string |group                  |           |
|token               |token for the user to authenticate                                                   |string |                       |           |

##### Response:

| responses          | description                                                                         | type  | sample                | optional |
|:------------------:|:------------------------------------------------------------------------------------|:-----:|:----------------------|:--------:|
|statusCode          |result code of the function                                                          |string |0                      | false    |
|message             |optional status message                                                              |string |                       | true     |


listGroups
----------

list existing Group

##### Request:

| arguments          | description                                                                         | type  | sample                | default   |
|:------------------:|:------------------------------------------------------------------------------------|:-----:|:----------------------|:----------|
|function            |function to select and run                                                           |string |listGroups             |           |
|token               |token for the user to authenticate                                                   |string |                       |           |

##### Response:

| responses          | description                                                                         | type  | sample                | optional |
|:------------------:|:------------------------------------------------------------------------------------|:-----:|:----------------------|:--------:|
|listGroup           |array of available Group                                                             |array  |                       | false    |
|statusCode          |result code of the function                                                          |string |0                      | false    |
|message             |optional status message                                                              |string |                       | true     |


sender
------

register a new stream as sender

##### Request:

| arguments          | description                                                                         | type  | sample                | default   |
|:------------------:|:------------------------------------------------------------------------------------|:-----:|:----------------------|:----------|
|function            |function to select and run                                                           |string |sender                 |           |
|workspace           |name of the workspace                                                                |string |Holodeck               |           |
|senderID            |if one wishes to update a stream, set the existing streamID                          |string |                       |           |
|from                |apps can set a corresponding stream this data came from                              |string |                       |           |
|proto               |Protocol for the stream to use (udp/tcp/ws)                                          |string |udp                    |           |
|IP                  |IP address from which the connection will be made (this is usually the IP one gets from the auth function)|string |                       |           |
|port                |Port from which the connection will be made, keep the port 0 when the client is behind a firewall.|string |                       |0          |
|type                |Set the type of stream (e.g. 3d, audio)                                              |string |3d                     |           |
|alert               |alerts the client if a new receiver subscribes to this stream                        |boolen |                       |false      |
|meta                |custom metadata specific to this stream to send to receivers                         |string |                       |           |
|token               |Token for the user to authenticate                                                   |string |                       |           |

##### Response:

| responses          | description                                                                         | type  | sample                | optional |
|:------------------:|:------------------------------------------------------------------------------------|:-----:|:----------------------|:--------:|
|statusCode          |result code of the function                                                          |string |0                      | false    |
|streamID            |ID of the new stream                                                                 |string |                       | false    |
|IP                  |IP address to which the connection shall be made                                     |string |                       | true     |
|port                |Port to which the connection shall be made                                           |string |                       | false    |
|MTU                 |Size of the MTU incl. header. 0 is unlimited                                         |string |                       | false    |
|message             |optional status message                                                              |string |                       | true     |


listStreams
-----------

list existing stream

##### Request:

| arguments          | description                                                                         | type  | sample                | default   |
|:------------------:|:------------------------------------------------------------------------------------|:-----:|:----------------------|:----------|
|function            |function to select and run                                                           |string |listStreams            |           |
|workspaces          |Name of the workspace (or an array thereof) see the streams of. Leave empty or omit to search all workspaces.|array  |Holodeck               |           |
|types               |Restict listing to a particular type of stream (e.g. 3d, audio). If the parameter is omitted all stream types will be listed|array  |3d                     |           |
|token               |token for the user to authenticate                                                   |string |                       |           |

##### Response:

| responses          | description                                                                         | type  | sample                | optional |
|:------------------:|:------------------------------------------------------------------------------------|:-----:|:----------------------|:--------:|
|senderList          |array of streamID/user/apps/type/meta/workspace of the streams that will be sent     |array  |                       | false    |
|statusCode          |result code of the function                                                          |string |0                      | false    |
|message             |optional status message                                                              |string |                       | true     |


streamInfo
----------

get information about a stream

##### Request:

| arguments          | description                                                                         | type  | sample                | default   |
|:------------------:|:------------------------------------------------------------------------------------|:-----:|:----------------------|:----------|
|function            |function to select and run                                                           |string |streamInfo             |           |
|streamID            |ID of the stream to get information about                                            |string |$$sender.streamID      |           |
|token               |token for the user to authenticate                                                   |string |                       |           |

##### Response:

| responses          | description                                                                         | type  | sample                | optional |
|:------------------:|:------------------------------------------------------------------------------------|:-----:|:----------------------|:--------:|
|statusCode          |result code of the function                                                          |string |0                      | false    |
|info                |information about the stream(streamID/user/apps/type/meta/workspace)                 |object |                       | false    |
|message             |optional status message                                                              |string |                       | true     |


receiver
--------

register a new stream as receiver

##### Request:

| arguments          | description                                                                         | type  | sample                | default   |
|:------------------:|:------------------------------------------------------------------------------------|:-----:|:----------------------|:----------|
|function            |function to select and run                                                           |string |receiver               |           |
|workspace           |name of the workspace                                                                |string |Holodeck               |           |
|receiverID          |if one wishes to update a stream, set the existing streamID                          |string |                       |           |
|streamIDs           |array of stream IDs to receive. if the argument is omitted all streams of a type will be sent.|array  |                       |           |
|proto               |Protocol for the stream to use (udp/tcp/ws)                                          |string |udp                    |udp        |
|type                |Restict reception to a particular type of stream (e.g. 3d, audio). An empty array or ommiting the value will receive all streams.|array  |3d                     |           |
|alert               |alerts the client if a new stream of this type is created                            |boolen |                       |false      |
|echo                |recevies streams of the same user if true                                            |boolen |                       |false      |
|subscribe           |to subscribe to all the Stream                                                       |boolen |                       |true       |
|IP                  |IP address from which the connection will be made (this is usually the IP one gets from the auth function)|string |                       |           |
|port                |Port from which the connection will be made. This should be 0 for for cases when the client is behind a firewall.|string |                       |0          |
|meta                |custom metadata specific to this stream to send to senders                           |string |                       |           |
|token               |token for the user or app to authenticate                                            |string |                       |           |

##### Response:

| responses          | description                                                                         | type  | sample                | optional |
|:------------------:|:------------------------------------------------------------------------------------|:-----:|:----------------------|:--------:|
|statusCode          |result code of the function                                                          |string |0                      | false    |
|streamID            |new streamID that designates the receiver                                            |string |                       | false    |
|streamList          |array of streamID/user/apps [array of app names]/type/meta of the streams that will be sent|array  |                       | false    |
|IP                  |IP to which the connection of the client shall be made                               |string |                       | true     |
|port                |Port to which the connection will be made                                            |string |                       | false    |
|proto               |Protocol for the stream to use (udp/tcp/ws)                                          |string |udp                    | false    |
|MTU                 |Size of the MTU incl. header. 0 is unlimited                                         |integer|                       | false    |
|message             |optional status message                                                              |string |                       | true     |


subscribe
---------

subscribe additional streams to an existing receiver

##### Request:

| arguments          | description                                                                         | type  | sample                | default   |
|:------------------:|:------------------------------------------------------------------------------------|:-----:|:----------------------|:----------|
|function            |function to select and run                                                           |string |subscribe              |           |
|receiverID          |set the existing receiver streamID                                                   |string |$$receiver.streamID    |           |
|streamIDs           |array of stream IDs to receive. new streams will be added to existing already subscribed streams.|array  |$$sender.streamID      |           |
|token               |token for the user to authenticate                                                   |string |                       |           |

##### Response:

| responses          | description                                                                         | type  | sample                | optional |
|:------------------:|:------------------------------------------------------------------------------------|:-----:|:----------------------|:--------:|
|statusCode          |result code of the function                                                          |string |0                      | false    |
|streamList          |array of streamID/user/apps/type/meta of the streams that will be sent               |array  |                       | false    |
|message             |optional status message                                                              |string |                       | true     |


unsubscribe
-----------

unsubscribe streams from an existing receiver

##### Request:

| arguments          | description                                                                         | type  | sample                | default   |
|:------------------:|:------------------------------------------------------------------------------------|:-----:|:----------------------|:----------|
|function            |function to select and run                                                           |string |unsubscribe            |           |
|receiverID          |set the existing receiver streamID                                                   |number |$$receiver.streamID    |           |
|streamIDs           |array of stream IDs to unsubscribe.                                                  |array  |$$sender.streamID      |           |
|token               |token for the user to authenticate                                                   |string |                       |           |

##### Response:

| responses          | description                                                                         | type  | sample                | optional |
|:------------------:|:------------------------------------------------------------------------------------|:-----:|:----------------------|:--------:|
|statusCode          |result code of the function                                                          |string |0                      | false    |
|streamList          |array of streamID of the streams that were deleted                                   |array  |                       | false    |
|message             |optional status message                                                              |string |                       | true     |


setConfig
---------

set a server config

##### Request:

| arguments          | description                                                                         | type  | sample                | default   |
|:------------------:|:------------------------------------------------------------------------------------|:-----:|:----------------------|:----------|
|function            |function to select and run                                                           |string |setConfig              |           |
|config              |the parameter that should be set                                                     |string |debug                  |           |
|context             |context that this cofiguration applies to global (server global settings), profile (global user specific settings), app (app global settings), or private (app user specific settings), if omitted or empty it is a global configuration parameter|string |                       |global     |
|app                 |an app name that this cofiguration applies to, can be omitted or empty for global or profile configuration parameters|string |                       |           |
|user                |an user name that this cofiguration applies to, can be omitted or empty for global or app configuration parameters, only an admin can set this parameter, otherwise the logged in username will be taken.|string |                       |           |
|value               |value to apply to the parameter, all parameters are stored as strings, but are applied in the defined type|string |true                   |           |
|token               |token for the user to authenticate                                                   |string |                       |           |

##### Response:

| responses          | description                                                                         | type  | sample                | optional |
|:------------------:|:------------------------------------------------------------------------------------|:-----:|:----------------------|:--------:|
|statusCode          |result code of the function                                                          |string |0                      | false    |
|message             |optional status message                                                              |string |                       | true     |


disconnect
----------

disconnect a stream or several streams for the logged in user

##### Request:

| arguments          | description                                                                         | type  | sample                | default   |
|:------------------:|:------------------------------------------------------------------------------------|:-----:|:----------------------|:----------|
|function            |function to select and run                                                           |string |disconnect             |           |
|workWorkspaces      |name of the workspace to search for source streams (an empty array indicates all workspaces), it is ignored when specific streamIDs are given|array  |                       |           |
|types               |source stream types to search (an empty array indicates all stream types), it is ignored when specific streamIDs are given|array  |                       |           |
|streamIDs           |ID's of the streams to discard (if an empty array is given all source streams that match workspace and type will be discarded)|array  |                       |           |
|token               |token for the user to authenticate                                                   |string |                       |           |

##### Response:

| responses          | description                                                                         | type  | sample                | optional |
|:------------------:|:------------------------------------------------------------------------------------|:-----:|:----------------------|:--------:|
|statusCode          |result code of the function                                                          |string |0                      | false    |
|streamList          |streams that were disconnected                                                       |array  |                       | false    |
|message             |optional status message                                                              |string |                       | true     |


expire
------

expire a user session

##### Request:

| arguments          | description                                                                         | type  | sample                | default   |
|:------------------:|:------------------------------------------------------------------------------------|:-----:|:----------------------|:----------|
|function            |function to select and run                                                           |string |expire                 |           |
|token               |token of the user session to expire                                                  |string |                       |           |

##### Response:

| responses          | description                                                                         | type  | sample                | optional |
|:------------------:|:------------------------------------------------------------------------------------|:-----:|:----------------------|:--------:|
|statusCode          |result code of the function                                                          |string |0                      | false    |
|message             |optional status message                                                              |string |                       | true     |

