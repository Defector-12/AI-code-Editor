package com.bjh.boaicodeeditor.ai;

import com.bjh.boaicodeeditor.ai.model.HtmlCodeResult;
import com.bjh.boaicodeeditor.ai.model.MultiFileCodeResult;
import jakarta.annotation.Resource;
import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;

import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest
class AiCodeGeneratorServiceTest {

    @Resource
    private AiCodeGeneratorService aiCodeGeneratorService;

    @Test
    void generateHtmlCode() {
        HtmlCodeResult result = aiCodeGeneratorService.generateHtmlCode( "做一个个人介绍博客界面，不超过 20 行代码");
        Assertions.assertNotNull(result);
    }

    @Test
    void generateMultiFileCode() {
        MultiFileCodeResult result = aiCodeGeneratorService.generateMultiFileCode("做一个留言板界面，不超过 60 行代码");
        Assertions.assertNotNull(result);
    }

    @Test
    void testChatMemory() {
        HtmlCodeResult result = aiCodeGeneratorService.generateHtmlCode("做个简单的搜索框，总代码量不超过 20 行");
        Assertions.assertNotNull(result);
        result = aiCodeGeneratorService.generateHtmlCode("不要生成代码，告诉我你刚刚做了什么？");
        Assertions.assertNotNull(result);
        result = aiCodeGeneratorService.generateHtmlCode("做个简单的搜索框，总代码量不超过 20 行");
        Assertions.assertNotNull(result);
        result = aiCodeGeneratorService.generateHtmlCode("不要生成代码，告诉我你刚刚做了什么？");
        Assertions.assertNotNull(result);
    }


}