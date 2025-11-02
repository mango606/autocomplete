package com.example.autocomplete.service;

import com.example.autocomplete.domain.SearchQuery;
import com.example.autocomplete.domain.Trie;
import jakarta.annotation.PostConstruct;
import lombok.extern.slf4j.Slf4j;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@Service
@Slf4j
public class AutocompleteService {

    private final Trie trie;
    private final RedisTemplate<String, Object> redisTemplate;
    private final Map<String, Integer> queryFrequencyMap;
    private static final String QUERY_FREQUENCY_KEY = "query:frequency:";
    private static final int MAX_SUGGESTIONS = 10;

    public AutocompleteService(RedisTemplate<String, Object> redisTemplate) {
        this.trie = new Trie();
        this.redisTemplate = redisTemplate;
        this.queryFrequencyMap = new ConcurrentHashMap<>();
        initializeSampleData();
    }

    @PostConstruct
    public void initializeSampleData() {
        // 샘플 데이터
        List<SearchQuery> sampleQueries = List.of(
                new SearchQuery("스프링 부트", 5000, 150),
                new SearchQuery("스프링 클라우드", 4500, 120),
                new SearchQuery("스프링 시큐리티", 4000, 100),
                new SearchQuery("스프링 데이터 JPA", 3500, 95),
                new SearchQuery("스프링 배치", 3000, 80),
                new SearchQuery("자바 21", 6000, 200),
                new SearchQuery("자바 스트림", 5500, 180),
                new SearchQuery("자바스크립트 async", 5000, 160),
                new SearchQuery("자바스크립트 promise", 4800, 155),
                new SearchQuery("도커 컴포즈", 4500, 140),
                new SearchQuery("도커 이미지", 4300, 130),
                new SearchQuery("쿠버네티스", 5500, 170),
                new SearchQuery("쿠버네티스 파드", 5000, 150),
                new SearchQuery("레디스 캐시", 4700, 145),
                new SearchQuery("레디스 클러스터", 4200, 125),
                new SearchQuery("카프카 스트림", 4800, 148),
                new SearchQuery("카프카 프로듀서", 4500, 142),
                new SearchQuery("리액트 hooks", 6000, 190),
                new SearchQuery("리액트 컴포넌트", 5800, 185),
                new SearchQuery("타입스크립트", 6500, 210),
                new SearchQuery("타입스크립트 제네릭", 6200, 200),
                new SearchQuery("마이크로서비스", 5500, 175),
                new SearchQuery("마이크로서비스 아키텍처", 5200, 165),
                new SearchQuery("데이터베이스 인덱스", 5000, 160),
                new SearchQuery("데이터베이스 최적화", 4800, 155)
        );

        for (SearchQuery query : sampleQueries) {
            trie.insert(query.getQuery(), query.getFrequency());
            queryFrequencyMap.put(query.getQuery(), query.getFrequency());
        }

        log.info("Initialized {} sample queries", sampleQueries.size());
    }

    @Cacheable(value = "autocomplete", key = "#prefix")
    public List<String> getSuggestions(String prefix) {
        if (prefix == null || prefix.trim().isEmpty()) {
            return List.of();
        }

        log.debug("Getting suggestions for prefix: {}", prefix);
        return trie.search(prefix.trim(), MAX_SUGGESTIONS);
    }

    public void recordQuery(String query) {
        if (query == null || query.trim().isEmpty()) {
            return;
        }

        String normalizedQuery = query.trim().toLowerCase();

        trie.incrementFrequency(normalizedQuery);

        queryFrequencyMap.merge(normalizedQuery, 1, Integer::sum);

        String key = QUERY_FREQUENCY_KEY + normalizedQuery;
        redisTemplate.opsForValue().increment(key, 1);

        log.debug("Recorded query: {}", normalizedQuery);
    }

    public Map<String, Integer> getPopularQueries(int limit) {
        return queryFrequencyMap.entrySet().stream()
                .sorted(Map.Entry.<String, Integer>comparingByValue().reversed())
                .limit(limit)
                .collect(java.util.stream.Collectors.toMap(
                        Map.Entry::getKey,
                        Map.Entry::getValue,
                        (e1, e2) -> e1,
                        java.util.LinkedHashMap::new
                ));
    }
}