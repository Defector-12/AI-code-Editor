package com.bjh.boaicodeeditor.ai.tools;

import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;

/**
 * 文件跟踪器，用于防止重复生成文件
 */
@Slf4j
@Component
public class FileTracker {
    
    // 使用 appId 作为 key，存储该应用已生成的文件路径集合
    private final ConcurrentHashMap<Long, Set<String>> generatedFiles = new ConcurrentHashMap<>();
    
    /**
     * 检查文件是否已经生成
     */
    public boolean isFileGenerated(Long appId, String filePath) {
        Set<String> files = generatedFiles.get(appId);
        return files != null && files.contains(filePath);
    }
    
    /**
     * 记录已生成的文件
     */
    public void trackFile(Long appId, String filePath) {
        generatedFiles.computeIfAbsent(appId, k -> ConcurrentHashMap.newKeySet()).add(filePath);
        log.debug("Tracked file for app {}: {}", appId, filePath);
    }
    
    /**
     * 清除应用的文件记录（在新的生成任务开始时调用）
     */
    public void clearTracking(Long appId) {
        generatedFiles.remove(appId);
        log.debug("Cleared file tracking for app {}", appId);
    }
    
    /**
     * 获取应用已生成的文件数量
     */
    public int getGeneratedFileCount(Long appId) {
        Set<String> files = generatedFiles.get(appId);
        return files != null ? files.size() : 0;
    }
}
