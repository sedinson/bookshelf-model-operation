'use strict';

var async = require('async'),
    Promise = require('bluebird'),
    _ = require('lodash'),
    check = require('basic-check'),
    normalize = require('restify-normalize');

module.exports = function (Log) {
    return function (Model) {
        return {
            /**
             * options: {
             *  values: {<field1>: '<value1>', <field2>: '<value2>'},
             *  verify: {<fiel_name>: '[string|date|datetime|integer|float|email|...]'},
             *  [pick|omit]: ['<field1>', '<field2>']
             * }
             */
            create: function (options, callback) {
                return new Promise(function (resolve, reject) {
                    async.waterfall([
                        //-- Normalize data information
                        function (cb) {
                            normalize(
                                Model.prototype.tableName, options.values
                            ).then(function (values) {
                                cb(null, values);
                            }).catch(cb);
                        },
        
                        //-- Verify params if is need it
                        function (params, cb) {
                            if(options.verify) {
                                var rsp = check(params).verify(options.verify);
        
                                if(rsp.length > 0) {
                                    cb(new Error(rsp.join('\n')));
                                } else {
                                    cb(null, params);
                                }
                            } else {
                                cb(null, params);
                            }
                        },
                        
                        //-- Create the object
                        function (params, cb) {
                            new Model().save(_[options.omit? 'omit' : 'pick'](params, options.pick || options.omit), {
                                patch: false
                            }).then(function (model) {
                                cb(null, model.toJSON());
                            }).catch(cb);
                        },
        
                        //-- Register log
                        function (model, cb) {
                            if(options.auth && Log) {
                                new Log({
                                    user_id: options.auth.id,
                                    morph_type: Model.prototype.tableName,
                                    morph_id: model.id,
                                    action: 'insert',
                                    _new: JSON.stringify(model)
                                }).save().then(function () {
                                    cb(null, model);
                                }).catch(function () {
                                    cb(null, model);
                                });
                            } else {
                                cb(null, model);
                            }
                        }
                    ], function (err, model) {
                        callback && callback(err, model);
                        err? reject(err) : resolve(model);
                    });
                });
            },
    
            /**
             * options: {
             *  id: <id to update>,
             *  [pick|omit]: ['<field1>', '<field2>'],
             *  values: {<field1>: '<value1>', <field2>: '<value2>'}
             * }
             */
            update: function (options, callback) {
                return new Promise(function (resolve, reject) {
                    async.waterfall([
                        //-- Normalize data information
                        function (cb) {
                            normalize(
                                Model.prototype.tableName, options.values
                            ).then(function (values) {
                                cb(null, values);
                            }).catch(cb);
                        },
        
                        //-- Find the object
                        function (params, cb) {
                            new Model({
                                id: options.id
                            }).fetch().then(function (model) {
                                if(!model) {
                                    cb(new Error(options.errors || 'Elemento no existe'));
                                } else {
                                    cb(null, params, model.toJSON(), model);
                                }
                            }).catch(cb);
                        },
        
                        //-- Update the object
                        function (params, copy, model, cb) {
                            model.save(
                                _[options.omit? 'omit' : 'pick'](params, options.pick || options.omit),
                                { patch: true }
                            ).then(function (model) {
                                cb(null, copy, model.toJSON());
                            }).catch(cb);
                        },
                        
                        function (copy, model, cb) {
                            if(options.auth && Log) {
                                new Log({
                                    user_id: options.auth.id,
                                    morph_type: Model.prototype.tableName,
                                    morph_id: model.id,
                                    action: 'update',
                                    _old: JSON.stringify(copy),
                                    _new: JSON.stringify(model)
                                }).save().then(function () {
                                    cb(null, model, copy);
                                }).catch(function () {
                                    cb(null, model, copy);
                                });
                            } else {
                                cb(null, model, copy);
                            }
                        }
                    ], function (err, model, copy) {
                        callback && callback(err, model, copy);
                        err? reject(err) : resolve(model, copy);
                    });
                });
            },
    
            /**
             * options: {
             *  id: <id to remove>,
             * }
             */
            del: function (options, callback) {
                return new Promise(function (resolve, reject) {
                    async.waterfall([
                        function (cb) {
                            new Model({
                                id: options.id
                            }).fetch().then(function (model) {
                                if (!model) {
                                    cb(new Error(options.errors || 'Elemento no encontrado'));
                                } else {
                                    cb(null, model.toJSON(), model);
                                }
                            }).catch(cb);
                        },
        
                        function (copy, model, cb) {
                            model.destroy().then(function () {
                                cb(null, copy);
                            }).catch(cb);
                        },
        
                        function (model, cb) {
                            if(options.auth && Log) {
                                new Log({
                                    user_id: options.auth.id,
                                    morph_type: Model.prototype.tableName,
                                    morph_id: model.id,
                                    action: 'delete',
                                    _old: JSON.stringify(model)
                                }).save().then(function () {
                                    cb(null, model);
                                }).catch(function () {
                                    cb(null, model);
                                });
                            } else {
                                cb(null, model);
                            }
                        }
                    ], function (err, model) {
                        callback && callback(err, model);
                        err? reject(err) : resolve(model);
                    });
                });
            }
        };
    };
};