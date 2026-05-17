package com.ttcs.backend.utils;

import com.ttcs.backend.dto.response.PageResponse;
import java.util.List;

public final class PageUtils {

    private PageUtils() {
    }

    public static <T> PageResponse<T> paginate(List<T> items, int page, int size) {
        int safePage = Math.max(page, 0);
        int safeSize = Math.max(size, 1);
        int fromIndex = Math.min(safePage * safeSize, items.size());
        int toIndex = Math.min(fromIndex + safeSize, items.size());
        int totalPages = (int) Math.ceil((double) items.size() / safeSize);
        return new PageResponse<>(items.subList(fromIndex, toIndex), safePage, safeSize, items.size(), totalPages);
    }
}
