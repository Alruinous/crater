// Copyright 2026 The Crater Project Team, RAIDS-Lab
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

package util

import (
	"path"
	"strings"

	"github.com/raids-lab/crater/internal/bizerr"
	"github.com/raids-lab/crater/pkg/config"
)

// PublicPathPolicy is expressed in logical paths so clients never need storage prefixes.
type PublicPathPolicy struct {
	BlockedPaths []string `json:"blockedPaths"`
}

func GetPublicPathPolicy() PublicPathPolicy {
	return buildPublicPathPolicy(config.GetConfig().Storage.BlockedPublicPaths)
}

func buildPublicPathPolicy(additional []string) PublicPathPolicy {
	paths := []string{"public", "public/Models", "public/Datasets"}
	seen := map[string]bool{}
	result := PublicPathPolicy{}
	for _, raw := range append(paths, additional...) {
		p := path.Clean(strings.ReplaceAll(raw, `\`, "/"))
		p = strings.TrimPrefix(p, "/")
		if (p == "public" || strings.HasPrefix(p, "public/")) && !seen[p] {
			seen[p] = true
			result.BlockedPaths = append(result.BlockedPaths, p)
		}
	}
	return result
}

// NormalizeResourcePath cleans storage-relative paths without permitting escape.
func NormalizeResourcePath(raw string) (string, error) {
	raw = strings.TrimLeft(strings.ReplaceAll(raw, `\`, "/"), "/")
	depth := 0
	for _, segment := range strings.Split(raw, "/") {
		switch segment {
		case "", ".":
		case "..":
			depth--
		default:
			depth++
		}
		if depth < 0 {
			return "", bizerr.BadRequest.ParameterError.New("Storage path must not escape its root")
		}
	}
	p := path.Clean(raw)
	if p == "." || strings.ContainsRune(p, '\x00') {
		return "", bizerr.BadRequest.ParameterError.New("A non-empty storage path is required")
	}
	return p, nil
}

func ValidateResourcePath(raw string) error {
	return validateResourcePath(raw, config.GetConfig().Storage.Prefix.Public, GetPublicPathPolicy())
}

func validateResourcePath(raw, publicPrefix string, policy PublicPathPolicy) error {
	p, err := NormalizeResourcePath(raw)
	if err != nil {
		return err
	}
	prefix := strings.Trim(path.Clean(strings.ReplaceAll(publicPrefix, `\`, "/")), "/")
	if prefix != "" && prefix != "." {
		if p == prefix {
			p = "public"
		} else if strings.HasPrefix(p, prefix+"/") {
			p = "public/" + strings.TrimPrefix(p, prefix+"/")
		}
	}
	for _, blocked := range policy.BlockedPaths {
		if p == blocked {
			return bizerr.BadRequest.ParameterError.New("Select a specific subdirectory or use bulk resource selection; public collection roots cannot be registered or mounted")
		}
	}
	return nil
}
