//V1.0.0.0

//set the token to the value that matches the access token in the Corelink
var token = '!kljhkl'

var config = require('../../../config/configure');
const control = require('../../../lib/corelink.lib');

var _ = require('underscore');
var math3d = require('math3d');

var patched = []
var workspace = 'Holodeck'
var protocol  = 'udp'
var receiverType = ['vive']
var senderType   = 'avatar'



const run = async () => {
    if(await control.connect({token:token},config).catch((err) => { console.log(err) })) {
        //cleaning all previous streams from this app
        await control.disconnect()

        received = await control.createReceiver(workspace, protocol, [], receiverType, true).catch((err) => { console.log(err) })
        console.log("done");
        for(var stream in received)
            patched[received[stream].streamid] = await control.createSender(workspace, protocol, senderType, '', received[stream].streamid)

        control.on('close', () => {
            console.log('Control connection closed.')
            process.exit()
        })

        control.on('receiver',async (data) => {
            received = await control.subscribe([data.streamid])
            console.log('New streams announced', received)
            for(var stream in received)
                if(typeof patched[received[stream].streamid] == 'undefined')
                    patched[received[stream].streamid] = await control.createSender(workspace, protocol, senderType, '', received[stream].streamid)
        })

        control.on('data',(streamid, data, timestamp)=> {
            console.log(`received: d${data.length}, stream ${streamid}, t${timestamp}`);
            var bones = parseViveData(data.toString());
            control.send(patched[streamid], Buffer.from(JSON.stringify(bones)));
        })


        // takes in Vive data, creates skeleton data.
        // Skeleton bone structure is as follows:
        // hips
        // - spine
        // -- leftupleg
        // --- leftleg
        // ---- leftfoot
        // -- rightupleg
        // --- rightleg
        // ---- rightfoot
        // -- spine1
        // --- spine2
        // ---- neck
        // ----- head
        // ----- leftshoulder
        // ------ leftarm
        // ------- leftforearm
        // -------- lefthand
        // ----- rightshoulder
        // ------ rightarm
        // ------- rightforearm
        // -------- righthand
        function parseViveData(strdata) {
            var data = JSON.parse(strdata);
            // TODO: how should we actually map trackers to hands?
            // some sort of registration/setup might be necessary
            var lhtracker = _.find(data, (obj) => {
                return obj['id'] === 'lefthand';
            });
            var rhtracker = _.find(data, (obj) => {
                return obj['id'] === 'righthand';
            });
            var headtracker = _.find(data, (obj) => {
                return obj['id'] === 'head';
            });

            var lefthand = {
                name: "lefthand",
                position: lhtracker ? (new math3d.Vector3(
                    parseFloat(lhtracker['x'] || "0"),
                    parseFloat(lhtracker['y'] || "0"),
                    parseFloat(lhtracker['z'] || "0"))) :
                    math3d.Vector3.zero,
                rotation: lhtracker ? (new math3d.Quaternion(
                    parseFloat(lhtracker['qx'] || "0"),
                    parseFloat(lhtracker['qy'] || "0"),
                    parseFloat(lhtracker['qz'] || "0"),
                    parseFloat(lhtracker['qw'] || "1"))) :
                    math3d.Quaternion.identity,
            };
            var righthand = {
                name: "righthand",
                position: rhtracker ? (new math3d.Vector3(
                    parseFloat(rhtracker['x'] || "0"),
                    parseFloat(rhtracker['y'] || "0"),
                    parseFloat(rhtracker['z'] || "0"))) :
                    math3d.Vector3.zero,
                rotation: rhtracker ? (new math3d.Quaternion(
                    parseFloat(rhtracker['qx'] || "0"),
                    parseFloat(rhtracker['qy'] || "0"),
                    parseFloat(rhtracker['qz'] || "0"),
                    parseFloat(rhtracker['qw'] || "1"))) :
                    math3d.Quaternion.identity,
            };
            var head = {
                name: "head",
                position: headtracker ? (new math3d.Vector3(
                    parseFloat(headtracker['x'] || "0"),
                    parseFloat(headtracker['y'] || "0"),
                    parseFloat(headtracker['z'] || "0"))) :
                    math3d.Vector3.zero,
                rotation: headtracker ? (new math3d.Quaternion(
                    parseFloat(headtracker['qx'] || "0"),
                    parseFloat(headtracker['qy'] || "0"),
                    parseFloat(headtracker['qz'] || "0"),
                    parseFloat(headtracker['qw'] || "1"))) :
                    math3d.Quaternion.identity,
            };

            var ARM_LENGTH = parseFloat(data["armlength"] || "0.6");
            // constant offsets
            // the torso is modeled here as a rigid object, so we just need to define
            // where the bones are relative to one another
            // these definitions are based off of a standard model
            var offsets = {
                head: {
                    position: new math3d.Vector3(0, 0, 0),
                    rotation: math3d.Quaternion.Euler(0, 0, 0),
                },
                righthand: {
                    position: new math3d.Vector3(0, 0, 0),
                    rotation: math3d.Quaternion.Euler(90, 90, 180),
                },
                lefthand: {
                    position: new math3d.Vector3(0, 0, 0),
                    rotation: math3d.Quaternion.Euler(90, -90, 180),
                },
                hips: {
                    position: new math3d.Vector3(0, -0.55, 0),
                    rotation: math3d.Quaternion.Euler(0, 0, 0),
                },
                spine: {
                    position: new math3d.Vector3(0, 0.05, 0),
                    rotation: math3d.Quaternion.Euler(0, 0, 0),
                },
                spine1: {
                    position: new math3d.Vector3(0, 0.1, 0),
                    rotation: math3d.Quaternion.Euler(0, 0, 0),
                },
                spine2: {
                    position: new math3d.Vector3(0, 0.15, 0),
                    rotation: math3d.Quaternion.Euler(0, 0, 0),
                },
                neck: {
                    position: new math3d.Vector3(0, 0.16, -0.01),
                    rotation: math3d.Quaternion.Euler(0, 0, 0),
                },
                rightshoulder: {
                    position: new math3d.Vector3(-0.1, 0, 0),
                    rotation: math3d.Quaternion.Euler(0, 0, 0),
                },
                rightarm: {
                    position: new math3d.Vector3(0, 0, 0),
                    rotation: math3d.Quaternion.Euler(0, 0, 0),
                },
                rightforearm: {
                    position: new math3d.Vector3(0, 0, ARM_LENGTH / 2.0),
                    rotation: math3d.Quaternion.Euler(0, 0, 0),
                },
                rightforearmHand: {
                    position: new math3d.Vector3(0, 0, -ARM_LENGTH / 2.0),
                    rotation: math3d.Quaternion.Euler(0, 0, 0),
                },
                leftshoulder: {
                    position: new math3d.Vector3(0.1, 0, 0),
                    rotation: math3d.Quaternion.Euler(0, 0, 0),
                },
                leftarm: {
                    position: new math3d.Vector3(0, 0, 0),
                    rotation: math3d.Quaternion.Euler(0, 0, 0),
                },
                leftforearm: {
                    position: new math3d.Vector3(0, 0, ARM_LENGTH / 2.0),
                    rotation: math3d.Quaternion.Euler(0, 0, 0),
                },
                leftforearmHand: {
                    position: new math3d.Vector3(0, 0, -ARM_LENGTH / 2.0),
                    rotation: math3d.Quaternion.Euler(0, 0, 0),
                },
            }

            var setNextBone = function (bonename, prevbone) {
                var bone = {
                    name: bonename,
                    position: prevbone.position.add((prevbone.rotation || math3d.Quaternion.identity).mulVector3(offsets[bonename].position)),
                    rotation: prevbone.rotation.mul(offsets[bonename].rotation),
                };
                return bone;
            }

            var fromToVectorRotation = function (v1, v2) {
                var cross = v1.cross(v2);
                var dot = v1.dot(v2);
                return math3d.Quaternion.AngleAxis(cross, 180 / Math.PI * Math.acos(dot));
            }

            head.position = head.position.add(head.rotation.mulVector3(offsets["head"].position));
            head.rotation = head.rotation.mul(offsets["head"].rotation);

            righthand.position = righthand.position.add(righthand.rotation.mulVector3(offsets["righthand"].position));
            righthand.rotation = righthand.rotation.mul(offsets["righthand"].rotation);

            lefthand.position = lefthand.position.add(lefthand.rotation.mulVector3(offsets["lefthand"].position));
            lefthand.rotation = lefthand.rotation.mul(offsets["lefthand"].rotation);

            // TORSO
            //var hips = setNextBone("hips", head);
            var HIP_HEIGHT = parseFloat(data["hipheight"] || "0.7");
            var hips = {
                name: "hips",
                position: new math3d.Vector3(0, HIP_HEIGHT, 0),
                rotation: fromToVectorRotation(math3d.Vector3.up, head.position.sub(new math3d.Vector3(0, HIP_HEIGHT, 0)).normalize())
            }
            var spine = setNextBone("spine", hips);
            var spine1 = setNextBone("spine1", spine);
            var spine2 = setNextBone("spine2", spine1);
            var neck = setNextBone("neck", spine2);
            head.position = neck.position.add(neck.rotation.mulVector3(new math3d.Vector3(0, 0.075, 0)));

            // ARMS
            var rightshoulder = setNextBone("rightshoulder", neck);
            var rightarm = setNextBone("rightarm", rightshoulder);
            var rightforearm = setNextBone("rightforearmHand", righthand);
            rightarm.rotation = fromToVectorRotation(math3d.Vector3.forward, rightforearm.position.sub(rightarm.position).normalize());
            rightforearm = setNextBone("rightforearm", rightarm);
            rightforearm.rotation = fromToVectorRotation(math3d.Vector3.forward, righthand.position.sub(rightforearm.position).normalize());
            righthand.position = rightforearm.position.add(rightforearm.rotation.mulVector3(new math3d.Vector3(0, 0, ARM_LENGTH / 2.0)));
            var leftshoulder = setNextBone("leftshoulder", neck);
            var leftarm = setNextBone("leftarm", leftshoulder);
            var leftforearm = setNextBone("leftforearmHand", lefthand);
            leftarm.rotation = fromToVectorRotation(math3d.Vector3.forward, leftforearm.position.sub(leftarm.position).normalize());
            leftforearm = setNextBone("leftforearm", leftarm);
            leftforearm.rotation = fromToVectorRotation(math3d.Vector3.forward, lefthand.position.sub(leftforearm.position).normalize());
            lefthand.position = leftforearm.position.add(leftforearm.rotation.mulVector3(new math3d.Vector3(0, 0, ARM_LENGTH / 2.0)));

            // LEGS -- fixed for now, might allow for trackers later...


            var bones = [head, hips, spine, spine1, spine2, neck, rightshoulder, rightarm, rightforearm, righthand, leftshoulder, leftarm, leftforearm, lefthand];
            bones = _.map(bones, (bone) => {
                return {
                    name: bone.name,
                    x: bone.position.x,
                    y: bone.position.y,
                    z: bone.position.z,
                    qx: bone.rotation.x,
                    qy: bone.rotation.y,
                    qz: bone.rotation.z,
                    qw: bone.rotation.w
                }
            });
            //var bones = [head, righthand, lefthand];
            var bonesobj = _.object(_.map(bones, (bone) => bone.name), bones);
            return bonesobj;
        }
    }
}
  
run();
