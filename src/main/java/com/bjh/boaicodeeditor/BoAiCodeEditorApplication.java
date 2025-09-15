package com.bjh.boaicodeeditor;

import org.mybatis.spring.annotation.MapperScan;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

@SpringBootApplication
@MapperScan("com.bjh.boaicodeeditor.mapper")
public class BoAiCodeEditorApplication {

    public static void main(String[] args) {

        SpringApplication.run(BoAiCodeEditorApplication.class, args);

    }

}
