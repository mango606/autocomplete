package com.example.autocomplete.domain;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class SearchQuery {
    private String query;
    private long timestamp;
    private int frequency;

    public SearchQuery(String query) {
        this.query = query;
        this.timestamp = System.currentTimeMillis();
        this.frequency = 1;
    }
}