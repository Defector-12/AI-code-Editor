package com.bjh.boaicodeeditor.service;

import com.bjh.boaicodeeditor.model.dto.app.AppQueryRequest;
import com.bjh.boaicodeeditor.model.vo.AppVO;
import com.mybatisflex.core.query.QueryWrapper;
import com.mybatisflex.core.service.IService;
import com.bjh.boaicodeeditor.model.entity.App;

import java.util.List;

/**
 * 应用 服务层。
 *
 */
public interface AppService extends IService<App> {

    /**
     * 获取应用封装类
     */

    AppVO getAppVO(App app);

    /**
     * 获取应用封装类列表
     */
    List<AppVO> getAppVOList(List<App> appList);

    /**
     * 构造应用查询条件
     * @param appQueryRequest
     * @return
     */
    QueryWrapper getQueryWrapper(AppQueryRequest appQueryRequest);


}
