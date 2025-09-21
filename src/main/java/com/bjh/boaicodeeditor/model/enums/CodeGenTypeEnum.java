package com.bjh.boaicodeeditor.model.enums;

import cn.hutool.core.util.ObjUtil;
import lombok.Getter;

/**
 * 代码生成枚举类型
 */
@Getter
public enum CodeGenTypeEnum {

    HTML("原生 HTML 模式", "html"),
    MULTI_FILE("原生多文件模式", "mutil_html"),
    VUE_PROJECT("Vue 工程模式", "vue_project");

    private final String text;
    private final String value;

    CodeGenTypeEnum(String text, String value) {
        this.text = text;
        this.value = value;
    }

    /**
     * 根据value获取枚举
     * @param value
     * @return
     */
    public static CodeGenTypeEnum getEnumValue(String value) {
        if (ObjUtil.isEmpty(value)) {
            return null;
        }
        for (CodeGenTypeEnum anEnum : CodeGenTypeEnum.values()) {
            if (anEnum.value.equals(value)) {
                return anEnum;
            }
        }
        return null;
    }

}
