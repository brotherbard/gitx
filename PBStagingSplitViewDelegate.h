//
//  PBNiceSplitViewDelegate.h
//  GitX
//
//  Created by Felix Holmgren on 9/6/10.
//  Copyright 2010 Holmgren Interstellar. All rights reserved.
//

#import <Cocoa/Cocoa.h>
@class PBCommitMessageView;

@interface PBStagingSplitViewDelegate : NSObject<NSSplitViewDelegate> {
	PBCommitMessageView *messageView;
}

@property (assign) IBOutlet PBCommitMessageView *messageView;

@end
