package com.bjh.boaicodeeditor.ai.model.message;

import lombok.Getter;

/**
 * 流式消息类型枚举
 */
@Getter
public enum StreamMessageTypeEnum {

    AI_RESPONSE("ai_response", "AI响应"),
    TOOL_REQUEST("tool_request", "工具请求"),
    TOOL_EXECUTED("tool_executed", "工具执行结果");

    private final String value;
    private final String text;

    StreamMessageTypeEnum(final String value, final String text) {
        this.value = value;
        this.text = text;
    }

    /**
     * 根据值获取枚举
     */
    public static StreamMessageTypeEnum getEnumByValue(final String value) {
        for (StreamMessageTypeEnum typeEnume : values()) {
            if (typeEnume.getValue().equals(value)) {
                return typeEnume;
            }
        }
        return null;
    }
}
