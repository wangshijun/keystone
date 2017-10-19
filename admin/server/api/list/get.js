var async = require('async');
var assign = require('object-assign');
var listToArray = require('list-to-array');

module.exports = function (req, res) {
	var where = {};
	var fields = req.query.fields;
	var includeCount = req.query.count !== 'false';
	var includeResults = req.query.results !== 'false';
	if (includeResults && fields) {
		if (fields === 'false') {
			fields = false;
		}
		if (typeof fields === 'string') {
			fields = listToArray(fields);
		}
		if (fields && !Array.isArray(fields)) {
			return res.status(401).json({ error: 'fields must be undefined, a string, or an array' });
		}
	}
	var filters = req.query.filters;
	if (filters && typeof filters === 'string') {
		try { filters = JSON.parse(req.query.filters); }
		catch (e) { } // eslint-disable-line no-empty
	}
	if (typeof filters === 'object') {
		console.log('1111111111111', filters);
		assign(where, req.list.addFiltersToQuery(filters));
	}
	if (req.query.search) {
		console.log('2222222222222');
		assign(where, req.list.addSearchToQuery(req.query.search));
	}
	console.log('$$$$$$$$$$$$$*********', where);
	var query = req.list.model.find(where);
	// var query = req.list.model.find().populate({
	// 	path: ,
	// 	match: { name: where }
	// });
	if (req.query.populate) {
		console.log('--------', req.query.populate);
		query.populate(req.query.populate);
	}
	if (req.query.expandRelationshipFields && req.query.expandRelationshipFields !== 'false') {
		console.log('^^^^^^^^^', req.list.relationshipFields);
		req.list.relationshipFields.forEach(function (i) {
			query.populate(i.path);
		});
	}
	var sort = req.list.expandSort(req.query.sort);
	async.waterfall([
		function (next) {
			if (!includeCount) {
				return next(null, 0);
			}
			query.count(next);
		},
		function (count, next) {
			if (!includeResults) {
				return next(null, count, []);
			}
			query.find();
			query.limit(Number(req.query.limit) || 100);
			query.skip(Number(req.query.skip) || 0);
			if (sort.string) {
				query.sort(sort.string);
			}
			query.exec(function (err, items) {
				next(err, count, items);
			});
		},
	], function (err, count, items) {
		if (err) {
			res.logError('admin/server/api/list/get', 'database error finding items', err);
			return res.apiError('database error', err);
		}

		return res.json({
			results: includeResults
				? items.map(function (item) {
					return req.list.getData(item, fields, req.query.expandRelationshipFields);
				})
				: undefined,
			count: includeCount
				? count
				: undefined,
		});
	});
};
