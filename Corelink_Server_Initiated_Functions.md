Server Initiated Control Functions
==================================

update
------

update a receiver with a new stream from sender

##### Request:

| arguments          | description                                                                         | type  | sample                | default   |
|:------------------:|:------------------------------------------------------------------------------------|:-----:|:----------------------|:----------|
|function            |function that was triggered                                                          |string |update                 |           |
|receiverID          |receiverID that matched the new sender                                               |string |0                      |           |
|streamID            |streamID that was updated                                                            |string |0                      |           |
|user                |username of for the stream that is announced                                         |string |0                      |           |
|apps                |list of app names that have processed this stream                                    |array  |0                      |           |
|type                |the type of the stream (e.g. 3d, audio) that was updated                             |string |                       |           |
|meta                |metadata from the sender stream                                                      |string |                       |           |
|token               |optional token to authenticate the message                                           |string |                       |           |

subscriber
----------

Update a sender with a new stream that subscribed.

##### Request:

| arguments          | description                                                                         | type  | sample                | default   |
|:------------------:|:------------------------------------------------------------------------------------|:-----:|:----------------------|:----------|
|function            |function that was triggered                                                          |string |subscriber             |           |
|senderID            |senderID that the receiver subscribed to                                             |string |0                      |           |
|receiverID          |receiverID that subscribed                                                           |string |0                      |           |
|user                |username of for the stream that is subscribed                                        |string |0                      |           |
|app                 |app name for the stream that subscribed                                              |array  |0                      |           |
|meta                |metadata from the receiver stream                                                    |string |                       |           |
|token               |optional token to authenticate the message                                           |string |                       |           |

stale
-----

Update a receiver that stream is stale and not in use anymore. A sender might have dropped or the stream might have timed out.

##### Request:

| arguments          | description                                                                         | type  | sample                | default   |
|:------------------:|:------------------------------------------------------------------------------------|:-----:|:----------------------|:----------|
|function            |function that was triggered                                                          |string |stale                  |           |
|streamID            |streamID that is stale                                                               |string |0                      |           |
|token               |optional token to authenticate message                                               |string |                       |           |

dropped
-------

Update a sender that receivers have dropped or unsubscribed.

##### Request:

| arguments          | description                                                                         | type  | sample                | default   |
|:------------------:|:------------------------------------------------------------------------------------|:-----:|:----------------------|:----------|
|function            |function that was triggered                                                          |string |dropped                |           |
|streamID            |receiverID that was dropped                                                          |string |0                      |           |
|token               |optional token to authenticate message                                               |string |                       |           |
