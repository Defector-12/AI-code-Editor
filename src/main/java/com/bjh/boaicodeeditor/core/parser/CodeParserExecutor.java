package com.bjh.boaicodeeditor.core.parser;

import com.bjh.boaicodeeditor.ai.model.HtmlCodeResult;
import com.bjh.boaicodeeditor.exception.BusinessException;
import com.bjh.boaicodeeditor.exception.ErrorCode;
import com.bjh.boaicodeeditor.model.enums.CodeGenTypeEnum;

/**
 * 代码解析执行器
 * 根据代码生成类型执行相应的解析逻辑
 *
 */
public class CodeParserExecutor {

    public static final HtmlCodeParser htmlParser = new HtmlCodeParser();
    public static final MultiFileCodeParser multiFileParser = new MultiFileCodeParser();

    public static Object executeParser(String content, CodeGenTypeEnum codeGenType) {
        return switch (codeGenType) {
            case HTML -> htmlParser.parserCode(content);
            case MULTI_FILE -> multiFileParser.parserCode(content);
            default -> throw new BusinessException(ErrorCode.SYSTEM_ERROR, "不支持的代码生成类型: " + codeGenType);
        };
    }
}
