var vows = require('vows');
var assert = require('assert');
var util = require('util');
var asyncblock = require('../asyncblock.js');

var suite = vows.describe('functionality');

var noParams = function(callback){
    process.nextTick(function(){
        callback();
    });
};

var immed = function(callback){
    callback(null, 'immed');
};

var immedArray = function(callback) {
    callback(null, [1, 2, 3]);
};

var immedMultiple = function(callback) {
    callback(null, 1, 2, 3);
};

var echoAsFirstArg = function(message, callback){
    process.nextTick(function(){
        callback(message);
    });
};

var echoAsFirstArgSync = function(message, callback){
    callback(message);
};

var delayed = function(callback){
    process.nextTick(
        function(){
            callback(null, 'delayed');
        }
    );
};

var echo = function(message, callback){
    process.nextTick(
        function(){
            callback(null, message);
        }
    );
};

var echoImmed = function(message, callback){
    callback(null, message);
};

// sleeps for the specified amount of time and then calls the
// callback with the number of milliseconds since Jan 1, 1970
var sleepTest = function(sleepTime, callback) {
    setTimeout(
        function() {
            var d=new Date();
            var t = d.getTime();
            callback(null, t);
        },
        sleepTime
    );
};

var delayedAdd = function(flow, callback){
    process.nextTick(
        function(){
            delayed(flow.add('t2'));

            callback(null, 'delayedAdd');
        }
    );
};

var obj = {
    selfTest: function(callback){
        callback(null, this);
    },

    arrayTest: function(callback){
        callback(null, 1, 2, 3);
    },

    echo: function(message, callback){
        process.nextTick(function(){
            callback(null, message);
        });
    }
};

suite.addBatch({
    'A single result, immediately': {
        topic: function(){
            var self = this;

            asyncblock(function(flow){
                immed(flow.add());

                var result = flow.wait();

                self.callback(null, result);
            });
        },

        'Returns the right result': function(result){
            assert.equal(result, 'immed');
        }
    },

    'A single result, with event loop': {
        topic: function(){
            var self = this;

            asyncblock(function(flow){
                delayed(flow.add());

                var result = flow.wait();

                self.callback(null, result);
            });
        },

        'Returns the right result': function(result){
            assert.equal(result, 'delayed');
        }
    },

    'A single result, an array': {
        topic: function() {
            var self = this;

            asyncblock(function(flow){
                immedArray(flow.add());

                var result = flow.wait();

                self.callback(null, result);
            });
        },

        'Returns the right result': function(result){
            assert.deepEqual(result, [1, 2, 3]);
        }
    },

    'A single result, multiple values': {
        topic: function() {
            var self = this;

            asyncblock(function(flow){
                immedMultiple(flow.add());

                var result = flow.wait();

                self.callback(null, result);
            });
        },

        'Returns the right result': function(result){
            assert.deepEqual(result, 1);
        }
    },

    'Two results': {
        topic: function(){
            var self = this;

            asyncblock(function(flow){
                delayed(flow.add(1));
                immed(flow.add(2));

                var result = flow.wait();

                self.callback(null, result);
            });
        },

        'Returns the right result': function(result){
            assert.deepEqual(result, {
                1: 'delayed',
                2: 'immed'
            });
        }
    },

    'A timed test...': {
        topic: function(){
            var self = this;

            asyncblock(function(flow){
                var startTime = new Date();

                setTimeout(flow.add(), 100);

                flow.wait();

                setTimeout(flow.add(), 110);

                flow.wait();

                self.callback(null, new Date() - startTime);
            });
        },

        'Should take more than 200 ms': function(time){
            assert.greater(time, 200);
        }
    },

    'Callbacks that fire immediately': {
        topic: function(){
            var self = this;

            asyncblock(function(flow){
                immed(flow.add());

                flow.wait();

                immed(flow.add());

                flow.wait();

                self.callback();
            });
        },

        'Should not error': function(){
            assert.ok(true);
        }
    },

    "A mixture of callbacks that wait and don't": {
        topic: function(){
            var self = this;

            asyncblock(function(flow){
                immed(flow.add());

                flow.wait();

                immed(flow.add());

                flow.wait();

                delayed(flow.add());
                immed(flow.add());

                flow.wait();

                delayed(flow.add());

                flow.wait();

                immed(flow.add('b'));

                var endResult = flow.wait();

                self.callback(null, endResult);
            });
        },

        'Returns the right result': function(result){
            assert.equal(result.b, 'immed');
        }
    },

    "Three in parallel": {
        topic: function(){
            var self = this;

            asyncblock(function(flow){
                delayed(flow.add());
                delayed(flow.add('t2'));
                delayed(flow.add('t3'));

                var first = flow.wait();

                immed(flow.add());
                immed(flow.add());
                delayed(flow.add('t3'));

                var second = flow.wait();

                self.callback(null, {first: first, second: second});
            });
        },

        'Returns the right result': function(result) {
            assert.deepEqual(result.first, {
                t2: 'delayed',
                t3: 'delayed'
            });

            assert.deepEqual(result.second, {
                t3: 'delayed'
            });
        }
    },

    'Add a new task while waiting': {
        topic: function(){
            var self = this;

            asyncblock(function(flow){
                delayedAdd(flow, flow.add('t5'));

                var result = flow.wait();

                self.callback(null, result);
            });
        },

        'Returns the right result': function(result){
            assert.deepEqual(result, {
                t5: 'delayedAdd',
                t2: 'delayed'
            });
        }
    },

    'When using a formatted result': {
        topic: function(){
            var self = this;

            asyncblock(function(flow){
                delayed(flow.add(null, ['first']));

                var result = flow.wait();

                self.callback(null, result);
            });
        },

        'Returns the right result': function(result){
            assert.deepEqual(result, {
                 first: 'delayed'
            });
        }
    },

    'When using formatted results': {
        topic: function(){
            var self = this;

            asyncblock(function(flow){
                immedArray(flow.add(1, ['first']));
                delayed(flow.add(2, ['second']));
                var first = flow.wait();

                immedMultiple(flow.add(['one', 'two', 'three']));
                var second = flow.wait();

                self.callback(null, {first: first, second: second});
            });
        },

        'Returns the right result': function(result){

            assert.deepEqual(result.first, {
                1: {
                    first: [1, 2, 3]
                },
                2: {
                    second: 'delayed'
                }
            });

            assert.deepEqual(result.second, {
                one: 1,
                two: 2,
                three: 3
            });
        }
    },

    'Calling flow.wait when nothing has been added': {
        topic: function(){
            var self = this;

            asyncblock(function(flow){
                flow.wait();

                self.callback();
            });
        },

        'Should not error': function(){

        }
    },

    'maxParallel property limits the number of parallel tasks': {
        topic: function(){
            var self = this;

            asyncblock(function(flow){
                flow.maxParallel = 2; // limit to 2 parallel tasks

                sleepTest(350, flow.add('t350')); // adds first fiber and return immediately (fiber should sleep 350ms)
                sleepTest(200, flow.add('t200')); // adds second fiber and return immediately (fiber should sleep 200ms)
                sleepTest(100, flow.add('t100')); // should wait here until t200 finishes (fiber should sleep 100ms)

                var result = flow.wait();

                self.callback(null, result);
            });
        },

        'Should limit tasks': function(result){
            // t200 < t100 < t350
            assert.greater(result.t100, result.t200);
            assert.greater(result.t350, result.t100);
        }
    },

    'When running maxParallel in a loop': {
        topic: function(){
            var self = this;

            asyncblock(function(flow){
                flow.maxParallel = 10;

                for(var i = 0; i < 105; i++){
                    if(Math.random() > .5){
                        immed(flow.add(i));
                    } else {
                        delayed(flow.add(i));
                    }
                }

                var results = flow.wait();
                self.callback(null, results);
            });
        },

        'All tasks execute': function(results){
            for(var i = 0; i < 105; i++){
                if(!(i in results)) {
                    assert.fail();
                }
            }
        }
    },
    
    'When using forceWait to add tasks asyncronously': {
        topic: function() {
            var self = this;
            
            asyncblock(function(flow) {
                process.nextTick(function(){
                    delayed(flow.add('delayed'));
                    immed(flow.add('immed'));

                    process.nextTick(function(){
                        flow.doneAdding();
                    });
                });
                
                var result = flow.forceWait();
                
                self.callback(null, result);
            });
        },
        
        'All tasks are waited on': function(result){
            assert.deepEqual(result, { delayed: 'delayed', immed: 'immed' });
        }
    },

    'When using queue with wait': {
        topic: function(){
            var self = this;

            asyncblock(function(flow){
                flow.queue('delayed', function(callback){
                    delayed(callback);
                });

                flow.queue('immed', function(callback){
                    immed(callback);
                });

                var first = flow.wait();

                immed(flow.callback('immed'));

                delayed(flow.callback('delayed1'));

                flow.queue('delayed2', function(callback){
                    delayed(callback);
                });

                var second = flow.wait();

                flow.queue({ key: 'delayed3', timeout: 1000 }, function(callback){
                    delayed(callback);
                });
                var third = flow.wait();

                flow.queue({ key: 'delayed4', timeout: 1000 }, function(callback){
                    delayed(callback);
                });
                var fourth = flow.wait('delayed4');

                self.callback(null, { first: first, second: second, third: third, fourth: fourth });
            });
        },

        'Results are as expected': function(result) {
            assert.deepEqual(result.first, {
                delayed: 'delayed',
                immed: 'immed'
            });

            assert.deepEqual(result.second, {
                delayed1: 'delayed',
                delayed2: 'delayed',
                immed: 'immed'
            });

            assert.deepEqual(result.third, {
                delayed3: 'delayed'
            });

            assert.equal(result.fourth, 'delayed');
        }
    },

    'maxParallel in conjunction with queueAdd': {
        topic: function() {
            var self = this;

            asyncblock(function(flow) {
                flow.maxParallel = 10;
                var startTime = new Date();

                for(var i = 0; i < 100; i++){
                    (function(i){
                        process.nextTick(function(){
                            flow.queue(i, function(callback){
                                sleepTest(10, callback);
                            });

                            if(i === 99){
                                flow.doneAdding();
                            }
                        });
                    })(i);
                }

                var result = flow.forceWait();
                var endTime = new Date();

                result.time = endTime - startTime;

                self.callback(null, result);
            });
        },

        'All tasks are waited on': function(results){
            for(var i = 0; i < 100; i++){
                if(!(i in results)) {
                    assert.fail();
                }
            }

            //The test should take about 100 ms
            assert.greater(results.time, 99);
        }
    },

    'When waiting on specific keys': {
        topic: function(){
            var self = this;

            asyncblock(function(flow){
                var result = {};

                delayed(flow.add('delayed'));
                result.delayed = flow.wait('delayed');

                process.nextTick(function(){
                    delayed(flow.add('delayed1'));
                });

                result.delayed1 = flow.wait('delayed1');

                immed(flow.add());
                result.immed = flow.wait();

                delayed(flow.add('delayed2'));
                delayed(flow.add('delayed3'));
                result.delayed3 = flow.wait('delayed3');

                result.delayed2 = flow.wait();

                noParams(flow.add('noParams'));
                result.noParams = flow.wait('noParams');

                self.callback(null,result);
            });
        },

        'Results are as expected': function(result){
            assert.equal(result.delayed, 'delayed');

            assert.equal(result.delayed1, 'delayed');

            assert.equal(result.immed, 'immed');

            assert.equal(result.delayed3, 'delayed');

            assert.deepEqual(result.delayed2, { delayed2: 'delayed'});

            assert.equal(result.noParams, undefined);
        }
    },

    'When adding a task with the object syntax': {
        topic: function(){
            var self = this;

            asyncblock(function(flow){
                immedMultiple(flow.add({ key: 'key', responseFormat: ['one', 'two', 'three']}));

                self.callback(null, flow.wait());
            });
        },

        'The results are as expected': function(result){
            assert.deepEqual(result.key, {
                one: 1,
                two: 2,
                three: 3
            });
        }
    },

    'When running tasks with sync': {
        topic: function(){
            var self = this;

            asyncblock(function(flow){
                var first = flow.sync(immed);
                var second = flow.sync(delayed);

                delayed(flow.add('delayed'));
                var third = flow.sync(immed);
                var fourth = flow.sync(echo, 'fourth');

                var fifth = flow.wait('delayed');

                var sixth = flow.sync({}, echo, 'sixth');

                self.callback(null, { first: first, second: second, third: third, fourth: fourth, fifth: fifth, sixth: sixth});
            });
        },

        'The results are as expected': function(result){
            assert.equal(result.first, 'immed');
            assert.equal(result.second, 'delayed');
            assert.equal(result.third, 'immed');
            assert.equal(result.fourth, 'fourth');
            assert.equal(result.fifth, 'delayed');
            assert.equal(result.sixth, 'sixth');
        }
    },

    'When running asyncblocks inside of asyncblocks': {
        topic: function(){
            var self = this;
            var result = {};

            asyncblock(function(outerFlow){
                echo('outer', outerFlow.add('outer'));

                asyncblock(function(innerFlow1){
                    var cont = outerFlow.add();

                    echo('innerFlow1', innerFlow1.add());
                    result.innerFlow1 = innerFlow1.wait();

                    cont();
                });

                asyncblock(function(innerFlow2){
                    echo('innerFlow2', innerFlow2.add('innerFlow2'));
                });

                asyncblock(function(innerFlow3){
                    var cont = outerFlow.add();

                    echoImmed('innerFlow3', innerFlow3.add());
                    result.innerFlow3 = innerFlow3.wait();

                    cont();
                });

                asyncblock(function(innerFlow4){
                    var cont = outerFlow.add();

                    echo('innerFlow4', innerFlow4.add('a'));
                    result.innerFlow4a = innerFlow4.wait();

                    echo('innerFlow4', innerFlow4.add('b'));
                    result.innerFlow4b = innerFlow4.wait();

                    cont();
                });

                asyncblock(function(innerFlow5){
                    process.nextTick(function(){
                        echo('innerFlow5', innerFlow5.add());
                    });
                });

                asyncblock(function(innerFlow6){
                    var cont = outerFlow.add();

                    process.nextTick(function(){
                        echo('innerFlow6', innerFlow6.add());

                        innerFlow6.doneAdding();
                    });

                    result.innerFlow6 = innerFlow6.forceWait();
                    cont();
                });

                result.outer = outerFlow.wait('outer');
                outerFlow.wait();


                self.callback(null, result);
            });
        },

        'The results are as expected': function(result){
            assert.equal(result.outer, 'outer');
            assert.equal(result.innerFlow1, 'innerFlow1');
            assert.equal(result.innerFlow3, 'innerFlow3');
            assert.equal(result.innerFlow4a.a, 'innerFlow4');
            assert.equal(result.innerFlow4b.b, 'innerFlow4');
            assert.equal(result.innerFlow6, 'innerFlow6');
        }
    },

    'When using flow.set & flow.get': {
        topic: function(){
            var self = this;
            var result = {};

            asyncblock(function(flow){
                echo('first', flow.set('first'));
                result.first = flow.get('first');

                echo('second', flow.set('second'));
                result.second = flow.get('second');
                result.second = flow.get('second'); //Make sure we can get it twice

                echo('third', flow.set('third'));
                flow.wait(); //Make sure flow.wait doesn't interfere
                result.third = flow.get('third');

                echoImmed('fourth', flow.set('fourth'));
                result.fourth = flow.get('fourth');

                echo('fifth', flow.set('fifth'));
                result.fifth = flow.wait('fifth');

                echo('sixth', flow.add('sixth'));
                result.sixth = flow.get('sixth');

                flow.del('sixth');
                process.nextTick(function(){
                    echo('seventh', flow.set('sixth'));
                });
                result.seventh = flow.get('sixth');

                self.callback(null, result);
            });
        },

        'Results are as expected': function(result){
            assert.deepEqual(result, {
                first: 'first',
                second: 'second',
                third: 'third',
                fourth: 'fourth',
                fifth: 'fifth',
                sixth: 'sixth',
                seventh: 'seventh'
            });
        }
    },

    'When creating asyncblocks using fullstack & nostack': {
        topic: function(){
            var self = this;

            asyncblock.nostack(function(flow){

            });

            asyncblock.fullstack(function(flow){

            });

            self.callback();
        },

        'No errors occur': function(){

        }
    },

    'When using 1.7 flow.sync syntax': {
        topic: function(){
            var self = this;
            var result = {};

            asyncblock(function(flow){
                result.first = flow.sync(echo('first', flow.add()));

                result.second = flow.sync(echoImmed('second', flow.callback()));

                self.callback(null, result);
            });
        },

        'The results are as expected': function(result){
            assert.equal(result.first, 'first');
            assert.equal(result.second, 'second');
        }
    },

    'When using firstArgIsError = false': {
        topic: function(){
            var self = this;

            asyncblock(function(flow){
                var result = {};

                echoAsFirstArg('first', flow.add( { firstArgIsError: false } ));
                result.first = flow.wait();

                flow.firstArgIsError = false;

                echoAsFirstArgSync('second', flow.add());
                result.second = flow.wait();

                echoAsFirstArg('third', flow.add( { responseFormat: ['result'] } ));
                result.third = flow.wait();

                self.callback(null, result);
            });
        },

        'The results are as expected': function(result){
            assert.equal(result.first, 'first');
            assert.equal(result.second, 'second');
            assert.equal(result.third.result, 'third');
        }
    },

    'When using 2nd arg as callback': {
        topic: function(){
            asyncblock(
                function(flow){
                    echo('test', flow.add());

                    return flow.wait();
                },

                this.callback
            );
        },

        'The results are as expected': function(result){
            assert.equal(result, 'test');
        }
    },

    'When using 2nd arg as callback with error': {
        topic: function(){
            asyncblock(function(flow){
                echo('test', flow.add());

                throw new Error('Error');
            }, this.callback);
        },

        'The results are as expected': function(err, result){
            assert.equal(err.message, 'Error');
        }
    },

    'When using asyncblock.currentFlow': {
        topic: function(){
            var testCurrent = function(){
                var flow = asyncblock.getCurrentFlow();

                echo('test', flow.add());
                return flow.wait();
            };

            asyncblock(function(){
                return testCurrent();
            }, this.callback);
        },

        'Ok': function(result){
            assert.equal(result, 'test');
        }
    },

    'When receiving an object as an error': {
        topic: function(){
            var x = function(callback){
                asyncblock(function(flow){
                    var x = flow.add();
                    x({ msg: 'test' });
                    flow.wait();
                }, callback);
            };

            x(this.callback);
        },

        'The error is formed correctly': function(err, undefined){
            assert.equal(err.message, JSON.stringify({ msg: 'test' }));
            assert.equal(err.originalError.msg, 'test');
        }
    },

    'When receiving a string as an error': {
        topic: function(){
            var x = function(callback){
                asyncblock(function(flow){
                    var x = flow.add();
                    x('test');
                    flow.wait();
                }, callback);
            };

            x(this.callback);
        },

        'The error is formed correctly': function(err, undefined){
            assert.equal(err.message, 'test');
            assert.equal(err.originalError, 'test');
        }
    },

    'When receiving an Error object as an error': {
        topic: function(){
            var x = function(callback){
                asyncblock(function(flow){
                    var x = flow.add();
                    x(new Error('test'));
                    flow.wait();
                }, callback);
            };

            x(this.callback);
        },

        'The error is formed correctly': function(err, undefined){
            assert.equal(err.message, 'test');
            assert.equal(err.originalError.message, 'test');
        }
    }
});



suite.export(module);