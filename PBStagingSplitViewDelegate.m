//
//  PBNiceSplitViewDelegate.m
//  GitX
//
//  Created by Felix Holmgren on 9/6/10.
//  Copyright 2010 Holmgren Interstellar. All rights reserved.
//

#import "PBStagingSplitViewDelegate.h"
#import "PBGitDefaults.h"


@implementation PBStagingSplitViewDelegate
@synthesize messageView;

- (void)splitView:(NSSplitView *)splitView resizeSubviewsWithOldSize:(NSSize)oldSize
{
	CGFloat dividerThickness = [splitView dividerThickness];
	NSArray *subviews = [splitView subviews];
	NSView *unstaged = [subviews objectAtIndex:0];
	NSView *message = [subviews objectAtIndex:1];
	NSView *staged = [subviews objectAtIndex:2];

	float available = splitView.bounds.size.width - 2 * dividerThickness;
	float suggested = available / 3.0;

	// Duplicates calculation in PBCommitMessageView. Should be DRYed up.
	float characterWidth = [@" " sizeWithAttributes:[messageView typingAttributes]].width;
	float minMessageWidth = characterWidth * [PBGitDefaults commitMessageViewVerticalLineLength];
	float messageWidth = minMessageWidth * 1.5;
	messageWidth = MIN(suggested, messageWidth);

	float changesWidth = (available - messageWidth) / 2.0;

	float height = splitView.bounds.size.height;

	unstaged.frame = CGRectMake(0.0, 0.0, floorf(changesWidth), height);

	float xpos = floorf(changesWidth) + dividerThickness;
	message.frame = CGRectMake(xpos, 0.0, floorf(messageWidth), height);

	xpos += floorf(messageWidth) + dividerThickness;
	staged.frame = CGRectMake(xpos, 0.0, splitView.bounds.size.width - xpos, height);
}

@end
