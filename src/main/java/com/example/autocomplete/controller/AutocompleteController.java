package com.example.autocomplete.controller;

import com.example.autocomplete.service.AutocompleteService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.Set;

@Controller
@RequiredArgsConstructor
@Slf4j
public class AutocompleteController {

    private final AutocompleteService autocompleteService;
    private final RedisTemplate<String, Object> redisTemplate;

    @GetMapping("/")
    public String index(Model model) {
        Map<String, Integer> popularQueries = autocompleteService.getPopularQueries(10);
        model.addAttribute("popularQueries", popularQueries);
        return "index";
    }

    @GetMapping("/api/autocomplete")
    @ResponseBody
    public ResponseEntity<List<String>> autocomplete(@RequestParam String query) {
        List<String> suggestions = autocompleteService.getSuggestions(query);
        return ResponseEntity.ok(suggestions);
    }

    @PostMapping("/api/search")
    @ResponseBody
    public ResponseEntity<Map<String, String>> search(@RequestBody Map<String, String> request) {
        String query = request.get("query");

        if (query != null && !query.trim().isEmpty()) {
            autocompleteService.recordQuery(query);
        }

        return ResponseEntity.ok(Map.of(
                "status", "success",
                "query", query,
                "message", "검색이 기록되었습니다"
        ));
    }

    @GetMapping("/api/popular")
    @ResponseBody
    public ResponseEntity<Map<String, Integer>> getPopular(@RequestParam(defaultValue = "10") int limit) {
        Map<String, Integer> popularQueries = autocompleteService.getPopularQueries(limit);
        return ResponseEntity.ok(popularQueries);
    }

    @GetMapping("/api/stats/cache")
    @ResponseBody
    public ResponseEntity<Map<String, Object>> getCacheStats() {
        try {
            Set<String> keys1 = redisTemplate.keys("autocomplete::*");
            Set<String> keys2 = redisTemplate.keys("autocomplete:*");
            Set<String> keys3 = redisTemplate.keys("*autocomplete*");

            int cacheCount = 0;
            if (keys1 != null && !keys1.isEmpty()) {
                cacheCount = keys1.size();
            } else if (keys2 != null && !keys2.isEmpty()) {
                cacheCount = keys2.size();
            } else if (keys3 != null && !keys3.isEmpty()) {
                cacheCount = keys3.size();
            } else {
                log.warn("No cache keys found in Redis");
            }

            int totalQueries = autocompleteService.getPopularQueries(1000).size();

            return ResponseEntity.ok(Map.of(
                    "cachedQueries", cacheCount,
                    "totalQueries", totalQueries
            ));
        } catch (Exception e) {
            log.error("Failed to get cache stats", e);
            return ResponseEntity.ok(Map.of(
                    "cachedQueries", 0,
                    "totalQueries", 0,
                    "error", e.getMessage()
            ));
        }
    }
}