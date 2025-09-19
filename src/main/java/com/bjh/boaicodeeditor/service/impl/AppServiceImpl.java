package com.bjh.boaicodeeditor.service.impl;

import com.mybatisflex.spring.service.impl.ServiceImpl;
import com.bjh.boaicodeeditor.model.entity.App;
import com.bjh.boaicodeeditor.mapper.AppMapper;
import com.bjh.boaicodeeditor.service.AppService;
import org.springframework.stereotype.Service;

/**
 * 应用 服务层实现。
 *
 * @author Defector
 */
@Service
public class AppServiceImpl extends ServiceImpl<AppMapper, App>  implements AppService{

}
