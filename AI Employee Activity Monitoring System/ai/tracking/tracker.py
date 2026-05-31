import numpy as np

class Tracker:
    def __init__(self, max_lost=30, iou_threshold=0.3):
        """
        Centroid and IoU based multi-object tracker.
        max_lost: number of frames to keep a track active after it disappears.
        iou_threshold: minimum IoU to consider a match.
        """
        self.max_lost = max_lost
        self.iou_threshold = iou_threshold
        self.next_track_id = 1
        self.tracks = {} # id -> {'box': [x1,y1,x2,y2], 'lost': int, 'history': list}

    def update(self, detections):
        """
        Updates the tracker with new detections.
        detections: list of bounding boxes: [[x1, y1, x2, y2], ...]
        Returns:
            list of dicts containing tracked objects: {'id': int, 'box': [x1,y1,x2,y2]}
        """
        if not detections:
            # Mark all active tracks as lost
            for track_id in list(self.tracks.keys()):
                self.tracks[track_id]['lost'] += 1
                if self.tracks[track_id]['lost'] > self.max_lost:
                    del self.tracks[track_id]
            return []

        # Convert detections to numpy array
        det_boxes = np.array([d['box'] for d in detections])
        det_indices = list(range(len(det_boxes)))
        
        active_track_ids = [tid for tid, t in self.tracks.items() if t['lost'] == 0]
        matched_tracks = {} # track_id -> det_idx
        matched_dets = set()
        
        if active_track_ids:
            # Match current detections to active tracks
            track_boxes = np.array([self.tracks[tid]['box'] for tid in active_track_ids])
            
            # Calculate IoU matrix
            iou_matrix = np.zeros((len(active_track_ids), len(det_boxes)))
            for t_idx, t_box in enumerate(track_boxes):
                for d_idx, d_box in enumerate(det_boxes):
                    iou_matrix[t_idx, d_idx] = self._calculate_iou(t_box, d_box)
            
            # Greedily match highest IoU
            while True:
                if iou_matrix.size == 0 or np.max(iou_matrix) < self.iou_threshold:
                    break
                t_idx, d_idx = np.unravel_index(np.argmax(iou_matrix), iou_matrix.shape)
                
                track_id = active_track_ids[t_idx]
                matched_tracks[track_id] = d_idx
                matched_dets.add(d_idx)
                
                # Zero out matched row and column
                iou_matrix[t_idx, :] = -1.0
                iou_matrix[:, d_idx] = -1.0

        # Update matched tracks
        for track_id, det_idx in matched_tracks.items():
            self.tracks[track_id]['box'] = det_boxes[det_idx]
            self.tracks[track_id]['lost'] = 0
            self.tracks[track_id]['history'].append(det_boxes[det_idx])
            # Cap history length
            if len(self.tracks[track_id]['history']) > 100:
                self.tracks[track_id]['history'].pop(0)

        # Unmatched tracks get marked as lost
        for tid in self.tracks.keys():
            if tid not in matched_tracks:
                self.tracks[tid]['lost'] += 1

        # Create new tracks for unmatched detections
        for d_idx in det_indices:
            if d_idx not in matched_dets:
                self.tracks[self.next_track_id] = {
                    'box': det_boxes[d_idx],
                    'lost': 0,
                    'history': [det_boxes[d_idx]]
                }
                self.next_track_id += 1

        # Delete tracks that are lost for too long
        for tid in list(self.tracks.keys()):
            if self.tracks[tid]['lost'] > self.max_lost:
                del self.tracks[tid]

        # Prepare return results
        results = []
        for tid, t in self.tracks.items():
            if t['lost'] == 0:
                # Find matching detection metadata to preserve classes if present
                box = t['box']
                # Search for original detection index matching this box
                matched_det = None
                for d in detections:
                    if np.array_equal(d['box'], box):
                        matched_det = d
                        break
                
                results.append({
                    'id': tid,
                    'box': list(box),
                    'class_name': matched_det['class_name'] if matched_det else 'person',
                    'class_id': matched_det['class_id'] if matched_det else 0,
                    'sim_meta': matched_det.get('sim_meta') if matched_det else None
                })
        return results

    def _calculate_iou(self, boxA, boxB):
        # Determine the (x, y)-coordinates of the intersection rectangle
        xA = max(boxA[0], boxB[0])
        yA = max(boxA[1], boxB[1])
        xB = min(boxA[2], boxB[2])
        yB = min(boxA[3], boxB[3])

        # Compute the area of intersection rectangle
        interArea = max(0, xB - xA + 1) * max(0, yB - yA + 1)

        # Compute the area of both the prediction and ground-truth rectangles
        boxAArea = (boxA[2] - boxA[0] + 1) * (boxA[3] - boxA[1] + 1)
        boxBArea = (boxB[2] - boxB[0] + 1) * (boxB[3] - boxB[1] + 1)

        # Compute the intersection over union
        iou = interArea / float(boxAArea + boxBArea - interArea)
        return iou
