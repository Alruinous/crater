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

import "testing"

func TestResourcePathPolicy(t *testing.T) {
	policy := PublicPathPolicy{BlockedPaths: []string{"public", "public/Models", "public/Datasets", "public/LLM"}}
	for _, test := range []struct {
		path    string
		blocked bool
	}{
		{"public", true}, {"/public//Models/", true}, {`public\Models`, true},
		{"public/Models/Qwen/..", true}, {"shared/Models", true}, {"/shared", true},
		{"public/LLM", true}, {"public/Models/Qwen", false}, {"public/Models-extra", false},
		{"user/model", false}, {"account/model", false}, {"shared/Models/Qwen/a", false},
		{"../public/Models", true}, {"", true},
	} {
		t.Run(test.path, func(t *testing.T) {
			err := validateResourcePath(test.path, "shared", policy)
			if (err != nil) != test.blocked {
				t.Fatalf("path %q: error %v, blocked %v", test.path, err, test.blocked)
			}
		})
	}
}
func TestResourcePathPolicyDefaultsCannotBeRemoved(t *testing.T) {
	policy := buildPublicPathPolicy([]string{"public/LLM", "/public/Models/", "user", "public/LLM"})
	if len(policy.BlockedPaths) != 4 {
		t.Fatalf("unexpected policy: %#v", policy)
	}
	if err := validateResourcePath("public/LLM", "shared", policy); err == nil {
		t.Fatal("configured root allowed")
	}
}
