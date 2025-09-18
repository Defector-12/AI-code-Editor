package com.bjh.boaicodeeditor.core.parser;

/**
 * 代码解析器策略 接口
 * @param <T>
 */
public interface CodeParser<T> {
    /**
     * 解析代码内容
     * @param codeContent 原始代码内容
     * @return解析后的结果对象
     *
     * T  为泛型
     */
    T parserCode(String codeContent);
}
