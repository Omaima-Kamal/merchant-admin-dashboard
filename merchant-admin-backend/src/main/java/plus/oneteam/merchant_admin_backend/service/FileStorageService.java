package plus.oneteam.merchant_admin_backend.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.net.InetAddress;
import java.net.URI;
import java.net.UnknownHostException;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardOpenOption;
import java.time.Duration;
import java.util.Map;
import java.util.UUID;

@Service
public class FileStorageService {

    private static final Logger log = LoggerFactory.getLogger(FileStorageService.class);

    private static final long MAX_BYTES = 5L * 1024 * 1024; // 5 MB

    // Extension comes from the verified content type, never from the URL.
    // SVG is deliberately not allowed: it can contain scripts.
    private static final Map<String, String> EXTENSION_BY_TYPE = Map.of(
            "image/jpeg", ".jpg",
            "image/png", ".png",
            "image/gif", ".gif",
            "image/webp", ".webp");

    @Value("${app.upload.dir}")
    private String uploadDir;

    @Value("${app.upload.base-url}")
    private String baseUrl;

    // Redirects are NOT followed: a redirect could point at an internal address
    // after the check below has passed.
    private final HttpClient httpClient = HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(10))
            .followRedirects(HttpClient.Redirect.NEVER)
            .build();

    public String downloadAndStore(String sourceUrl) {
        if (sourceUrl == null || sourceUrl.isBlank()) {
            throw new IllegalArgumentException("Image URL is empty");
        }

        URI uri = validate(sourceUrl.trim());
        Path target = null;
        boolean stored = false;

        try {
            HttpRequest request = HttpRequest.newBuilder()
                    .uri(uri)
                    .timeout(Duration.ofSeconds(15))
                    .GET()
                    .build();

            HttpResponse<InputStream> response =
                    httpClient.send(request, HttpResponse.BodyHandlers.ofInputStream());

            try (InputStream in = response.body()) {
                if (response.statusCode() != 200) {
                    throw new IllegalArgumentException("Image download failed: HTTP " + response.statusCode());
                }

                String contentType = response.headers().firstValue("Content-Type").orElse("")
                        .split(";")[0].trim().toLowerCase();
                String extension = EXTENSION_BY_TYPE.get(contentType);
                if (extension == null) {
                    throw new IllegalArgumentException("Unsupported image type: " + contentType);
                }

                Path uploadPath = Paths.get(uploadDir).toAbsolutePath().normalize();
                Files.createDirectories(uploadPath);
                String filename = UUID.randomUUID() + extension;
                target = uploadPath.resolve(filename);

                copyWithLimit(in, target);
                stored = true;

                String localUrl = baseUrl + "/" + filename;
                log.info("Stored image from host={} as {}", uri.getHost(), localUrl);
                return localUrl;
            }

        } catch (IOException e) {
            log.error("Failed to download/store image from host={}", uri.getHost(), e);
            throw new RuntimeException("Failed to download image", e);
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            throw new RuntimeException("Image download interrupted", e);
        } finally {
            if (!stored && target != null) {
                try {
                    Files.deleteIfExists(target); // don't leave partial files behind
                } catch (IOException ignored) {
                    // best effort
                }
            }
        }
    }

    private void copyWithLimit(InputStream in, Path target) throws IOException {
        try (OutputStream out = Files.newOutputStream(target, StandardOpenOption.CREATE_NEW)) {
            byte[] buffer = new byte[8192];
            long total = 0;
            int read;
            while ((read = in.read(buffer)) != -1) {
                total += read;
                if (total > MAX_BYTES) {
                    throw new IllegalArgumentException("Image is larger than " + (MAX_BYTES / 1024 / 1024) + " MB");
                }
                out.write(buffer, 0, read);
            }
        }
    }

    /** Only http(s) URLs whose host resolves to public addresses are allowed. */
    private URI validate(String sourceUrl) {
        URI uri;
        try {
            uri = URI.create(sourceUrl);
        } catch (IllegalArgumentException e) {
            throw new IllegalArgumentException("Invalid image URL");
        }

        String scheme = uri.getScheme();
        if (scheme == null || !(scheme.equalsIgnoreCase("http") || scheme.equalsIgnoreCase("https"))) {
            throw new IllegalArgumentException("Image URL must start with http:// or https://");
        }
        if (uri.getHost() == null) {
            throw new IllegalArgumentException("Image URL has no host");
        }

        try {
            for (InetAddress address : InetAddress.getAllByName(uri.getHost())) {
                if (isInternal(address)) {
                    throw new IllegalArgumentException("Image URL points to a private or internal address");
                }
            }
        } catch (UnknownHostException e) {
            throw new IllegalArgumentException("Image host could not be resolved");
        }
        return uri;
    }

    private boolean isInternal(InetAddress a) {
        byte[] b = a.getAddress();
        boolean uniqueLocalV6 = b.length == 16 && (b[0] & 0xFE) == 0xFC;                  // fc00::/7
        boolean sharedV4 = b.length == 4 && (b[0] & 0xFF) == 100 && (b[1] & 0xC0) == 0x40; // 100.64.0.0/10
        return a.isAnyLocalAddress()
                || a.isLoopbackAddress()
                || a.isLinkLocalAddress()   // includes 169.254.169.254 (cloud metadata)
                || a.isSiteLocalAddress()   // 10/8, 172.16/12, 192.168/16
                || a.isMulticastAddress()
                || uniqueLocalV6
                || sharedV4;
    }
}