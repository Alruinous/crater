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

package handler

import (
	"github.com/gin-gonic/gin"
	"github.com/raids-lab/crater/internal/resputil"
	"github.com/raids-lab/crater/internal/util"
)

// GetPathPolicy returns logical collection roots excluded from user resource paths.
// @Summary Get resource path selection policy
// @Tags Dataset
// @Produce json
// @Security Bearer
// @Success 200 {object} resputil.Response[util.PublicPathPolicy]
// @Router /v1/dataset/path-policy [get]
func (mgr *DatasetMgr) GetPathPolicy(c *gin.Context) { resputil.Success(c, util.GetPublicPathPolicy()) }
