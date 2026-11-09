/**
 * BolasPro v4.0 - Anchor Module
 * Anchor point manipulation with compensation
 */

var Anchor = {
    /**
     * Apply delta to property (handles keyframes)
     */
    applyDelta: function(property, delta) {
        if (property.numKeys > 0) {
            for (var i = 1; i <= property.numKeys; i++) {
                var keyTime = property.keyTime(i);
                var val = property.keyValue(i);
                
                if (typeof delta === 'number') {
                    property.setValueAtTime(keyTime, val + delta);
                } else {
                    var newVal = [
                        val[0] + delta[0],
                        val[1] + delta[1],
                        (val[2] || 0) + (delta[2] || 0)
                    ];
                    property.setValueAtTime(keyTime, newVal);
                }
            }
        } else {
            var val = property.value;
            if (typeof delta === 'number') {
                property.setValue(val + delta);
            } else {
                var newVal = [
                    val[0] + delta[0],
                    val[1] + delta[1],
                    (val[2] || 0) + (delta[2] || 0)
                ];
                property.setValue(newVal);
            }
        }
    },
    
    /**
     * Get full transform matrix
     */
    getFullMatrix: function(layer, time) {
        if (!layer.threeDLayer) {
            var rot = layer.rotation.valueAtTime(time, false);
            return Matrix.rotation(0, 0, rot);
        }
        
        var orientX = 0, orientY = 0, orientZ = 0;
        if (layer.orientation) {
            var orient = layer.orientation.valueAtTime(time, false);
            orientX = orient[0];
            orientY = orient[1];
            orientZ = orient[2];
        }
        var matOrient = Matrix.rotation(orientX, orientY, orientZ);
        
        var rotX = 0, rotY = 0, rotZ = 0;
        if (layer.xRotation) rotX = layer.xRotation.valueAtTime(time, false);
        if (layer.yRotation) rotY = layer.yRotation.valueAtTime(time, false);
        if (layer.zRotation) rotZ = layer.zRotation.valueAtTime(time, false);
        var matRot = Matrix.rotation(rotX, rotY, rotZ);
        
        return Matrix.multiply(matRot, matOrient);
    },
    
    /**
     * Position compensation for anchor change
     */
    compensate: function(layer, oldAnchor, newAnchor) {
        var time = layer.containingComp.time;
        
        var oldVec = [oldAnchor[0], oldAnchor[1], oldAnchor[2] || 0];
        var newVec = [newAnchor[0], newAnchor[1], newAnchor[2] || 0];
        
        var deltaLocal = [
            newVec[0] - oldVec[0],
            newVec[1] - oldVec[1],
            newVec[2] - oldVec[2]
        ];
        
        var scale = layer.scale.valueAtTime(time, false);
        var scaleVec = [scale[0] / 100, scale[1] / 100, (scale[2] || 100) / 100];
        
        var deltaScaled = [
            deltaLocal[0] * scaleVec[0],
            deltaLocal[1] * scaleVec[1],
            deltaLocal[2] * scaleVec[2]
        ];
        
        var matrix = this.getFullMatrix(layer, time);
        var deltaParent = Matrix.transform(matrix, deltaScaled);
        
        var posProp = layer.property(Config.AE.TRANSFORM).property(Config.AE.POSITION);
        
        if (posProp.dimensionsSeparated) {
            this.applyDelta(posProp.getSeparationFollower(0), deltaParent[0]);
            this.applyDelta(posProp.getSeparationFollower(1), deltaParent[1]);
            if (layer.threeDLayer) {
                this.applyDelta(posProp.getSeparationFollower(2), deltaParent[2]);
            }
        } else {
            this.applyDelta(posProp, deltaParent);
        }
        
        return deltaParent;
    },
    
    /**
     * Set anchor point with compensation
     */
    setDirect: function(layer, anchorNum) {
        var validation = Validator.layer(layer, "Anchor");
        if (!validation.valid) return { success: false, error: validation.error };
        
        var time = layer.containingComp.time;
        var rect = layer.sourceRectAtTime(time, false);
        var ratio = Utils.getAnchorRatio(anchorNum);
        
        var newAnchor = [
            rect.left + rect.width * ratio[0],
            rect.top + rect.height * ratio[1]
        ];
        
        var anchorProp = layer.property(Config.AE.TRANSFORM).property(Config.AE.ANCHOR);
        var oldAnchor = anchorProp.value;
        
        if (layer.threeDLayer) {
            newAnchor.push(oldAnchor[2] || 0);
        }
        
        anchorProp.setValue(newAnchor);
        this.compensate(layer, oldAnchor, newAnchor);
        
        return { success: true };
    },
    
    /**
     * Set anchor for selected layers (Quick Anchor)
     */
    setForSelected: function(anchorNum) {
        var comp = app.project.activeItem;
        
        var validation = Validator.hasSelection(comp);
        if (!validation.valid) return { success: false, error: validation.error };
        
        var anchorValidation = Validator.anchorNum(anchorNum);
        anchorNum = anchorValidation.value;
        
        app.beginUndoGroup(Config.NAME + ": Quick Anchor " + anchorNum);
        
        try {
            var successCount = 0;
            var failCount = 0;
            
            for (var i = 0; i < comp.selectedLayers.length; i++) {
                var result = this.setDirect(comp.selectedLayers[i], anchorNum);
                if (result.success) {
                    successCount++;
                } else {
                    failCount++;
                }
            }
            
            app.endUndoGroup();
            
            return { 
                success: true, 
                message: "Anchor set for " + successCount + " layer(s)",
                successCount: successCount,
                failCount: failCount
            };
            
        } catch(e) {
            app.endUndoGroup();
            return { success: false, error: e.toString() };
        }
    },
    
    /**
     * Alias for setForSelected (used by API)
     */
    setQuickAnchor: function(anchorNum) {
        return this.setForSelected(anchorNum);
    }
};
