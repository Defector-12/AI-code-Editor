package com.bjh.boaicodeeditor.service;

import com.bjh.boaicodeeditor.model.dto.chathistory.ChatHistoryQueryRequest;
import com.bjh.boaicodeeditor.model.entity.User;
import com.mybatisflex.core.paginate.Page;
import com.mybatisflex.core.query.QueryWrapper;
import com.mybatisflex.core.service.IService;
import com.bjh.boaicodeeditor.model.entity.ChatHistory;

import java.time.LocalDateTime;

/**
 * 对话历史 服务层。
 *
 * @author Defector
 */
public interface ChatHistoryService extends IService<ChatHistory> {

    /**
     * 添加对话历史
     *
     * @param appId
     * @param message
     * @param messageType
     * @param userId
     * @return
     */
    boolean addChatMesage(Long appId, String message, String messageType, Long userId);

    /**
     * 根据应用ID 删除对话历史
     * @param appId
     * @return
     */
    boolean deletebyAppId(Long appId);

    /**
     * 分页查询某APP的对话记录
     * @param appId
     * @param pageSize
     * @param lastCteateTime
     * @param loginUser
     * @return
     */
    Page<ChatHistory> listAppChatHistoryByPage(Long appId, int pageSize,
                                               LocalDateTime lastCteateTime,
                                               User loginUser);

    /**
     * 构造查询条件
     * @param chatHistoryQueryRequest
     * @return
     */
    QueryWrapper getQueryWrapper(ChatHistoryQueryRequest chatHistoryQueryRequest);
}
