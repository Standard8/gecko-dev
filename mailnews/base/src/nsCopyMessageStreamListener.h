/* -*- Mode: C++; tab-width: 4; indent-tabs-mode: nil; c-basic-offset: 2 -*-
 *
 * The contents of this file are subject to the Netscape Public License
 * Version 1.0 (the "NPL"); you may not use this file except in
 * compliance with the NPL.  You may obtain a copy of the NPL at
 * http://www.mozilla.org/NPL/
 *
 * Software distributed under the NPL is distributed on an "AS IS" basis,
 * WITHOUT WARRANTY OF ANY KIND, either express or implied. See the NPL
 * for the specific language governing rights and limitations under the
 * NPL.
 *
 * The Initial Developer of this code under the NPL is Netscape
 * Communications Corporation.  Portions created by Netscape are
 * Copyright (C) 1999 Netscape Communications Corporation.  All Rights
 * Reserved.
 */

#ifndef NSCOPYMESSAGESTREAMLISTENER_H
#define NSCOPYMESSAGESTREAMLISTENER_H

#include "nsICopyMessageStreamListener.h"
#include "nsIStreamListener.h"
#include "nsIMsgFolder.h"
#include "nsICopyMessageListener.h"
#include "nsCOMPtr.h"

class nsCopyMessageStreamListener : public nsIStreamListener, public nsICopyMessageStreamListener {

public:
	nsCopyMessageStreamListener();
	virtual ~nsCopyMessageStreamListener();

	NS_DECL_ISUPPORTS

	//nsICopyMessageStreamListener
	NS_IMETHOD Init(nsIMsgFolder *srcFolder, nsICopyMessageListener *destination, nsISupports *listenerData);

	//nsIStreamListener implementation
	NS_IMETHOD GetBindInfo(nsIURL* aURL, nsStreamBindingInfo* aInfo);
	NS_IMETHOD OnDataAvailable(nsIURL* aURL, nsIInputStream *aIStream, 
                               PRUint32 aLength);
	NS_IMETHOD OnStartBinding(nsIURL* aURL, const char *aContentType);

	NS_IMETHOD OnProgress(nsIURL* aURL, PRUint32 aProgress, PRUint32 aProgressMax);

	NS_IMETHOD OnStatus(nsIURL* aURL, const PRUnichar* aMsg);

	NS_IMETHOD OnStopBinding(nsIURL* aURL, nsresult aStatus, const PRUnichar* aMsg);

protected:
	nsCOMPtr<nsICopyMessageListener> mDestination;
	nsCOMPtr<nsISupports> mListenerData;
	nsCOMPtr<nsIMsgFolder> mSrcFolder;

};

NS_BEGIN_EXTERN_C

nsresult
NS_NewCopyMessageStreamListener(const nsIID& iid, void **result);

NS_END_EXTERN_C

#endif
