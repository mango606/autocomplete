package com.example.autocomplete.domain;

import java.util.ArrayList;
import java.util.Collections;
import java.util.Comparator;
import java.util.List;
import java.util.stream.Collectors;

public class Trie {
    private final TrieNode root;

    public Trie() {
        this.root = new TrieNode();
    }

    public void insert(String word, int frequency) {
        if (word == null || word.isEmpty()) {
            return;
        }

        TrieNode current = root;
        word = word.toLowerCase();

        for (char c : word.toCharArray()) {
            current.getChildren().putIfAbsent(c, new TrieNode());
            current = current.getChildren().get(c);
        }

        current.setEndOfWord(true);
        current.setWord(word);
        current.setFrequency(frequency);
    }

    public void incrementFrequency(String word) {
        if (word == null || word.isEmpty()) {
            return;
        }

        TrieNode node = findNode(word.toLowerCase());
        if (node != null && node.isEndOfWord()) {
            node.incrementFrequency();
        }
    }

    private TrieNode findNode(String prefix) {
        TrieNode current = root;

        for (char c : prefix.toCharArray()) {
            TrieNode node = current.getChildren().get(c);
            if (node == null) {
                return null;
            }
            current = node;
        }

        return current;
    }

    public List<String> search(String prefix, int limit) {
        if (prefix == null || prefix.isEmpty()) {
            return Collections.emptyList();
        }

        prefix = prefix.toLowerCase();
        TrieNode node = findNode(prefix);

        if (node == null) {
            return Collections.emptyList();
        }

        List<TrieNode> results = new ArrayList<>();
        collectWords(node, results);

        return results.stream()
                .sorted(Comparator.comparingInt(TrieNode::getFrequency).reversed())
                .limit(limit)
                .map(TrieNode::getWord)
                .collect(Collectors.toList());
    }

    private void collectWords(TrieNode node, List<TrieNode> results) {
        if (node == null) {
            return;
        }

        if (node.isEndOfWord()) {
            results.add(node);
        }

        for (TrieNode child : node.getChildren().values()) {
            collectWords(child, results);
        }
    }
}