import apiStore from "../store/api";
import apiStackStore from "../store/apiStack";
import apiStatusStore from "../store/apiStatus";
import { storeProxiedServerBack } from "../service/apiService";
import { toJSONSchema } from "../utils";
const { wrap: async } = require("co");

/**
 * 查找Api
 * @param {*} req
 * @param {*} res
 */
function* findApi(req, res, type) {
  /**
   * 没找到，则存储该Api
   * @param {*} req
   * @param {*} res
   * @param {*} type
   */
  const notFind = async(function*(req, res, type) {
    //在模拟接口情况下
    if (type === "simulate") {
      res.status("404").send("this api isn't proxied");
      return false;
    }
    //代理情况下，则存储该接口
    let { baseUrl, rPath, method } = req;
    const api = {
      pro: baseUrl.substring(1),
      url: rPath,
      desc: "",
      method,
      paramsDeclare: []
    };
    return yield apiStore.add(api);
  });

  let { baseUrl, rPath, method } = req;
  const api = yield apiStore.getOne(baseUrl.substring(1), rPath, method);
  return yield (res.locals.api = api || notFind(req, res, type));
}

/**
 * 查找Api Status
 * @param {*} req
 * @param {*} res
 */
function* findApiStatus(req, res, type) {
  const notFind = async(function*(req, res, type) {
    if (type === "simulate") {
      res.status("404").send("this api status isn't proxied");
      return false;
    }
    //代理情况下，则存储该接口状态
    let { api, supervisorStatus } = res.locals;
    const apiStatus = {
      status: supervisorStatus,
      apiId: api.id,
      head: "",
      stable: ""
    };
    return yield apiStatusStore.add(apiStatus);
  });
  const { api, supervisorStatus } = res.locals;
  const apiStatus = yield apiStatusStore.getOneByApiStatus(
    api.id,
    supervisorStatus
  );
  return yield (res.locals.apiStatus = apiStatus || notFind(req, res, type));
}

/**
 * 查找某个接口的返回结果
 * @param {*} req
 * @param {*} res
 */
function* findApiStack(req, res, type) {
  const notFind = async(function*(req, res, type) {
    if (type === "simulate") {
      res.status("404").send("this api stack isn't proxied");
      return false;
    }
    //代理情况下，则存储该接口数据
    const { proxiedServerBack, apiStatus } = res.locals;
    const proxiedSBackSchema = toJSONSchema(JSON.stringify(proxiedServerBack));
    return yield storeProxiedServerBack(
      proxiedSBackSchema,
      proxiedServerBack,
      apiStatus,
      {},
      true
    );
  });
  const { apiStatus } = res.locals;
  const apiRes = yield apiStackStore.getHeadStack(apiStatus.stable);
  return yield (res.locals.apiRes = apiRes || notFind(req, res, type));
}

/**
 * log
 * @param {*} req
 * @param {*} res
 */
function logApiStack(req, res) {
  console.log("logApiStack", res.locals.apiRes);
  return true;
}

/**
 * response client
 * @param {*} req
 * @param {*} res
 */
function response(req, res) {
  res.json(res.locals.apiRes.result);
}

findApi = async(findApi);
findApiStatus = async(findApiStatus);
findApiStack = async(findApiStack);

export { findApi, findApiStatus, findApiStack, logApiStack, response };
