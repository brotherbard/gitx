//
//  PBCommitMessageView.m
//  GitX
//
//  Created by Jeff Mesnil on 13/10/08.
//  Copyright 2008 Jeff Mesnil (http://jmesnil.net/). All rights reserved.
//

#import "PBCommitMessageView.h"
#import "PBGitDefaults.h"

@implementation PBCommitMessageView

- (void)drawRect:(NSRect)aRect
{
	[super drawRect:aRect];

	// draw a vertical line after the given size (used as an indicator
	// for the first line of the commit message)
    if ([PBGitDefaults commitMessageViewHasVerticalLine]) {
        NSSize characterSize = [@" " sizeWithAttributes:[self typingAttributes]];
        float lineWidth = characterSize.width * [PBGitDefaults commitMessageViewVerticalLineLength];

        [[NSColor lightGrayColor] set];
        float padding = [[self textContainer] lineFragmentPadding];
        NSRect line;
        line.origin.x = padding + lineWidth;
        line.origin.y = 0;
        line.size.width = 1;
		if ([PBGitDefaults commitMessageViewHasSplitVerticalLine]) {
			line.size.height = characterSize.height;
			NSRectFill(line);
			line.origin.y = characterSize.height;
			lineWidth = characterSize.width * [PBGitDefaults commitMessageViewSplitVerticalLineLength];
			line.size.width = padding + lineWidth - line.origin.x;
			line.size.height = 1;
			if (line.size.width < 0) {
				line.origin.x = padding + lineWidth + 1;
				line.size.width = -line.size.width;
			}
			NSRectFill(line);
			line.origin.x = padding + lineWidth;
			line.size.width = 1;
			line.size.height = [self bounds].size.height - characterSize.height;
		} else {
			line.size.height = [self bounds].size.height;
		}
        NSRectFill(line);
    }
}

@end
